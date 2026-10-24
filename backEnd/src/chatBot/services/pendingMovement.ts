import { randomUUID } from "crypto";
import { getRedisClient } from "../../database/redis";
import { AppError } from "../../utils/errors";
import type { MovementItem, MovementType } from "../../services/stockMovementService";

// Confirmação de movimentações pelo chat, garantida no servidor e não só pelo prompt.
// Cada mensagem do usuário é um "turno". A prévia mostrada ao usuário fica guardada aqui e só pode ser
// executada num turno posterior, ou seja, depois de a pessoa ter lido o resumo e respondido.
// O que é registrado são os itens da prévia, não argumentos novos do modelo.

export interface PendingMovement {
  id: string;
  type: MovementType;
  items: MovementItem[];
  observation: string | null;
  turn: number;
}

const PENDING_TTL_SECONDS = 15 * 60;
const TURN_TTL_SECONDS = 24 * 60 * 60;
const turnKey = (userId: number) => `stock-system:chat:user:${userId}:turn`;
const pendingKey = (userId: number) => `stock-system:chat:user:${userId}:pending-movement`;

const unavailable = () => new AppError("Não foi possível confirmar a movimentação agora. Verifique o Redis.", 503);

// Chamado uma vez por mensagem recebida no chat.
export async function nextChatTurn(userId: number): Promise<number> {
  try {
    const redis = await getRedisClient();
    const [turn] = await redis.multi().incr(turnKey(userId)).expire(turnKey(userId), TURN_TTL_SECONDS).exec<[number, number]>();
    return Number(turn);
  } catch {
    throw unavailable();
  }
}

export async function savePendingMovement(userId: number, pending: Omit<PendingMovement, "id">): Promise<string> {
  const id = randomUUID();
  try {
    const redis = await getRedisClient();
    await redis.set(pendingKey(userId), JSON.stringify({ ...pending, id }), { ex: PENDING_TTL_SECONDS });
  } catch {
    throw unavailable();
  }
  return id;
}

export async function clearPendingMovement(userId: number) {
  try {
    const redis = await getRedisClient();
    await redis.del(pendingKey(userId));
  } catch {
    throw unavailable();
  }
}

// Valida e consome a prévia (uso único). Erros de regra vão ao modelo, que explica ao usuário.
export async function takePendingMovement(userId: number, type: MovementType, currentTurn: number): Promise<PendingMovement> {
  let raw: string | null;
  try {
    const redis = await getRedisClient();
    raw = await redis.get<string>(pendingKey(userId));
  } catch {
    throw unavailable();
  }
  if (!raw) {
    throw new AppError("Não há movimentação aguardando confirmação (ou ela expirou). Chame preview_stock_movement e mostre o resumo ao usuário.");
  }
  const pending = JSON.parse(raw) as PendingMovement;
  if (pending.type !== type) {
    throw new AppError(`A prévia aguardando confirmação é de ${pending.type === "input" ? "entrada" : "saída"}. Use a ferramenta correspondente ou faça uma nova prévia.`);
  }
  if (!Number.isSafeInteger(currentTurn) || currentTurn <= pending.turn) {
    throw new AppError("A confirmação precisa vir do usuário: mostre o resumo da prévia e aguarde a resposta dele antes de registrar.");
  }

  // getdel garante uso único mesmo com duas chamadas simultâneas.
  let taken: string | null;
  try {
    const redis = await getRedisClient();
    taken = await redis.getdel<string>(pendingKey(userId));
  } catch {
    throw unavailable();
  }
  if (taken !== raw) throw new AppError("A prévia mudou ou já foi usada. Faça uma nova prévia e confirme com o usuário.");
  return pending;
}
