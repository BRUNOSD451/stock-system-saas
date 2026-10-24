import { NextFunction, Request, Response } from "express";

// Limite de tentativas em memória (janela fixa). Suficiente para um único servidor; com várias
// instâncias o contador precisa ir para um armazenamento compartilhado, como o Redis já usado no chat.

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  // Chave do contador; devolva null para não limitar esta requisição.
  key: (req: Request) => string | null;
}

interface Bucket { count: number; resetAt: number; }

export function rateLimit({ windowMs, max, message, key }: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  // Limpeza periódica para o Map não crescer sem limite; unref não segura o processo aberto.
  setInterval(() => {
    const now = Date.now();
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const bucketKey = key(req);
    if (!bucketKey) return next();

    const now = Date.now();
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }
    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: message });
    }
    return next();
  };
}

const MINUTE = 60 * 1000;

const clientIp = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";
const authenticatedUser = (req: Request) => {
  const userId = (req as Request & { user?: { userId?: number } }).user?.userId;
  return userId ? `user:${userId}` : null;
};

// Login: por IP e também por celular, para frear quem testa senhas de uma conta só a partir de vários IPs.
export const loginLimitByIp = rateLimit({
  windowMs: 15 * MINUTE,
  max: 20,
  message: "Muitas tentativas de entrar. Aguarde alguns minutos e tente novamente.",
  key: (req) => `login-ip:${clientIp(req)}`,
});

export const loginLimitByAccount = rateLimit({
  windowMs: 15 * MINUTE,
  max: 8,
  message: "Muitas tentativas para este celular. Aguarde alguns minutos e tente novamente.",
  key: (req) => {
    const cell = String(req.body?.userCellNumber ?? "").replace(/\D/g, "");
    return cell ? `login-cell:${cell}` : null;
  },
});

export const signupLimit = rateLimit({
  windowMs: 60 * MINUTE,
  max: 5,
  message: "Muitos cadastros a partir desta rede. Tente novamente mais tarde.",
  key: (req) => `signup:${clientIp(req)}`,
});

export const passwordChangeLimit = rateLimit({
  windowMs: 15 * MINUTE,
  max: 10,
  message: "Muitas tentativas de trocar a senha. Aguarde alguns minutos.",
  key: authenticatedUser,
});

// O chat usa uma API paga: limite por usuário para conter abuso e custo.
export const chatLimit = rateLimit({
  windowMs: 10 * MINUTE,
  max: 30,
  message: "Você enviou muitas mensagens para a IA. Aguarde alguns minutos.",
  key: authenticatedUser,
});
