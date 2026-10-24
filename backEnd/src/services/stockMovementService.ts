import { db } from "../database/db";
import { AppError, ConflictError, NotFoundError } from "../utils/errors";
import { notificationService } from "./notificationService";
import { getLowStockThreshold } from "../repository/companiesRepository";

// Registro de entradas e saídas compartilhado pela API e pelo chatbot.
// Tudo acontece numa transação: se um produto faltar ou não tiver saldo, nada é gravado.
// Estornos e ajustes de inventário também passam por aqui, como entradas ou saídas de outro tipo.

export type MovementType = "input" | "output";
// regular: movimentação comum; reversal: estorno de uma regular do tipo oposto;
// adjustment: correção do saldo após contagem física.
export type MovementKind = "regular" | "reversal" | "adjustment";
export type MovementItem = { productId: number; quantity: number; unitPrice?: number };
export type MovementContext = { companyId: number; userId: number };

export const movementTables = {
  input: { table: "stock_inputs", id: "stock_input_id", items: "input_items", itemId: "input_item_id", label: "entrada", reverses: "reverses_output_id" },
  output: { table: "stock_outputs", id: "stock_output_id", items: "output_items", itemId: "output_item_id", label: "saída", reverses: "reverses_input_id" },
} as const;

const opposite = (type: MovementType): MovementType => (type === "input" ? "output" : "input");

const MAX_ID = 2147483647;
const MAX_QUANTITY = 1000000;

export const stockAfter = (type: MovementType, current: number, quantity: number) =>
  type === "input" ? current + quantity : current - quantity;

// Valida e junta itens repetidos do mesmo produto. A ordem por productId fixa a ordem dos bloqueios
// e evita deadlock entre movimentações simultâneas.
export function normalizeMovementItems(type: MovementType, raw: unknown): MovementItem[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) {
    throw new AppError("Informe de 1 a 50 produtos para a movimentação.");
  }
  const merged = new Map<number, MovementItem>();
  for (const entry of raw) {
    const item = (entry ?? {}) as Record<string, unknown>;
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(productId) || productId < 1 || productId > MAX_ID) {
      throw new AppError("Cada item precisa de um produto válido.");
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new AppError("A quantidade de cada produto deve ser um número inteiro maior que zero.");
    }
    let unitPrice: number | undefined;
    if (item.unitPrice !== undefined && item.unitPrice !== null) {
      if (type !== "input") throw new AppError("Preço unitário só pode ser informado em entradas.");
      const price = Number(item.unitPrice);
      if (!Number.isFinite(price) || price < 0 || price > 9999999999.99) throw new AppError("Informe um preço unitário válido.");
      unitPrice = Math.round(price * 100) / 100;
    }

    const existing = merged.get(productId);
    if (!existing) {
      merged.set(productId, { productId, quantity, unitPrice });
      continue;
    }
    if (existing.unitPrice !== undefined && unitPrice !== undefined && existing.unitPrice !== unitPrice) {
      throw new AppError(`O produto ${productId} foi informado mais de uma vez com preços diferentes.`);
    }
    existing.quantity += quantity;
    existing.unitPrice ??= unitPrice;
  }
  return [...merged.values()].sort((a, b) => a.productId - b.productId);
}

type QueryFn = (text: string, params?: unknown[]) => Promise<{ rows: Record<string, any>[] }>;

// Carrega os produtos da empresa; com lock, bloqueia as linhas até o fim da transação.
export async function loadMovementProducts(query: QueryFn, companyId: number, items: MovementItem[], lock: boolean) {
  const products = [];
  for (const item of items) {
    const { rows } = await query(
      `SELECT product_id, name, stock_quantity, unit, active FROM products WHERE product_id = ? AND company_id = ?${lock ? " FOR UPDATE" : ""}`,
      [item.productId, companyId]
    );
    if (!rows.length) throw new NotFoundError(`Produto ${item.productId} não encontrado.`);
    products.push({
      ...item,
      name: String(rows[0].name),
      currentStock: Number(rows[0].stockQuantity),
      unit: String(rows[0].unit ?? "un"),
      active: Boolean(Number(rows[0].active ?? 1)),
    });
  }
  return products;
}

type LoadedProduct = Awaited<ReturnType<typeof loadMovementProducts>>[number];

// Grava cabeçalho, itens e saldos dentro de uma transação já aberta, com os produtos já bloqueados.
async function writeMovement(
  query: QueryFn,
  type: MovementType,
  context: MovementContext,
  products: LoadedProduct[],
  observation: string | null,
  kind: MovementKind,
  reversesId: number | null,
) {
  const t = movementTables[type];
  await query(
    `INSERT INTO ${t.table} (company_id, user_id, observation, kind, ${t.reverses}) VALUES (?, ?, ?, ?, ?)`,
    [context.companyId, context.userId, observation, kind, reversesId]
  );
  // LAST_INSERT_ID é da conexão: dentro da transação, é sempre o INSERT acima.
  const idResult = await query("SELECT LAST_INSERT_ID() AS id");
  const movementId = Number(idResult.rows[0]?.id);
  if (!Number.isSafeInteger(movementId) || movementId <= 0) throw new AppError("Não foi possível registrar a movimentação.", 500);

  for (const product of products) {
    await query(
      `UPDATE products SET stock_quantity = stock_quantity ${type === "input" ? "+" : "-"} ? WHERE product_id = ? AND company_id = ?`,
      [product.quantity, product.productId, context.companyId]
    );
    if (type === "input") {
      await query("INSERT INTO input_items (company_id, stock_input_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
        [context.companyId, movementId, product.productId, product.quantity, product.unitPrice ?? null]);
    } else {
      await query("INSERT INTO output_items (company_id, stock_output_id, product_id, quantity) VALUES (?, ?, ?, ?)",
        [context.companyId, movementId, product.productId, product.quantity]);
    }
  }
  return {
    movementId,
    items: products.map(product => ({
      productId: product.productId,
      name: product.name,
      quantity: product.quantity,
      unit: product.unit,
      ...(product.unitPrice !== undefined ? { unitPrice: product.unitPrice } : {}),
      previousStock: product.currentStock,
      newStock: stockAfter(type, product.currentStock, product.quantity),
    })),
  };
}

// Saldo final abaixo do limite da empresa (tela Empresa) gera aviso de estoque baixo.
async function notifyMovement(type: MovementType, context: MovementContext, items: { name: string; newStock: number }[], lowStockThreshold: number) {
  // A movimentação já foi gravada; falha no aviso não pode desfazê-la nem ser relatada como erro dela.
  try {
    if (type === "input") {
      await notificationService.notificationInput(context.companyId, context.userId);
      return;
    }
    for (const item of items) {
      if (item.newStock < lowStockThreshold) {
        await notificationService.notificationFewProduct(context.companyId, item.newStock, item.name);
      }
    }
    await notificationService.notificationOutput(context.companyId, context.userId);
  } catch (error) {
    console.error("Falha ao gerar notificação de movimentação:", error);
  }
}

const isDuplicateEntry = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";

export async function registerStockMovement(
  type: MovementType,
  context: MovementContext,
  items: MovementItem[],
  observation: string | null,
  options: { kind?: MovementKind; reversesId?: number } = {},
) {
  const kind = options.kind ?? "regular";

  const movement = await db.transaction(async connection => {
    const query: QueryFn = (text, params) => db.queryOn(connection, text, params as any[]);
    const products = await loadMovementProducts(query, context.companyId, items, true);
    // Produto inativo não recebe movimentações novas; estornos e ajustes continuam permitidos.
    const inactive = kind === "regular" ? products.find(product => !product.active) : undefined;
    if (inactive) {
      throw new AppError(`${inactive.name} está inativo. Reative o produto para movimentá-lo.`, 409);
    }
    const insufficient = products.find(product => stockAfter(type, product.currentStock, product.quantity) < 0);
    if (insufficient) {
      throw new AppError(`Estoque insuficiente para ${insufficient.name}. Disponível: ${insufficient.currentStock}; solicitado: ${insufficient.quantity}. Nada foi registrado.`, 409);
    }
    return writeMovement(query, type, context, products, observation, kind, options.reversesId ?? null);
  });

  const lowStockThreshold = await getLowStockThreshold(context.companyId);
  await notifyMovement(type, context, movement.items, lowStockThreshold);
  return { ...movement, lowStockThreshold };
}

// Estorno: grava a movimentação oposta com os mesmos itens e liga as duas.
// Só movimentações regulares podem ser estornadas, uma única vez (garantido também pelo índice único).
export async function reverseStockMovement(type: MovementType, context: MovementContext, id: number) {
  const t = movementTables[type];
  const reversal = movementTables[opposite(type)];

  const { rows } = await db.query(`SELECT kind FROM ${t.table} WHERE ${t.id} = ? AND company_id = ?`, [id, context.companyId]);
  if (!rows.length) throw new NotFoundError(`${t.label === "entrada" ? "Entrada" : "Saída"} não encontrada.`);
  if (rows[0].kind === "reversal") {
    throw new AppError(`Esta ${t.label} já é um estorno e não pode ser estornada.`);
  }
  if (rows[0].kind !== "regular") {
    throw new AppError("Ajustes de inventário não são estornados. Para corrigir, faça um novo ajuste com a quantidade contada.");
  }

  const already = await db.query(`SELECT ${reversal.id} AS id FROM ${reversal.table} WHERE ${reversal.reverses} = ? AND company_id = ?`, [id, context.companyId]);
  if (already.rows.length) throw new ConflictError(`Esta ${t.label} já foi estornada (${reversal.label} #${already.rows[0].id}).`);

  const itemRows = await db.query(`SELECT product_id, quantity FROM ${t.items} WHERE ${t.id} = ? AND company_id = ?`, [id, context.companyId]);
  if (!itemRows.rows.length) throw new AppError(`Esta ${t.label} não tem produtos para estornar.`);
  const items = normalizeMovementItems(opposite(type), itemRows.rows.map(row => ({ productId: row.productId, quantity: Number(row.quantity) })));

  try {
    return await registerStockMovement(opposite(type), context, items, `Estorno da ${t.label} #${id}`, { kind: "reversal", reversesId: id });
  } catch (error) {
    // Dois estornos simultâneos: o índice único barra o segundo.
    if (isDuplicateEntry(error)) throw new ConflictError(`Esta ${t.label} já foi estornada.`);
    throw error;
  }
}

// Ajuste de inventário: informa a quantidade contada; a diferença vira uma entrada ou saída do tipo "adjustment".
// A diferença é calculada com o produto bloqueado, para não usar um saldo que mudou no meio do caminho.
export async function adjustStock(context: MovementContext, productId: number, countedQuantity: number, reason: string) {
  if (!Number.isSafeInteger(productId) || productId < 1 || productId > MAX_ID) throw new AppError("Informe um produto válido.");
  if (!Number.isSafeInteger(countedQuantity) || countedQuantity < 0 || countedQuantity > MAX_ID) {
    throw new AppError("A quantidade contada deve ser um número inteiro maior ou igual a zero.");
  }
  if (reason.length < 3 || reason.length > 300) throw new AppError("Informe o motivo do ajuste (de 3 a 300 caracteres).");

  const result = await db.transaction(async connection => {
    const query: QueryFn = (text, params) => db.queryOn(connection, text, params as any[]);
    const [product] = await loadMovementProducts(query, context.companyId, [{ productId, quantity: 1 }], true);
    const difference = countedQuantity - product.currentStock;
    if (difference === 0) {
      throw new AppError(`O saldo de ${product.name} já é ${product.currentStock}. Nada foi ajustado.`);
    }
    if (Math.abs(difference) > MAX_QUANTITY) {
      throw new AppError(`A diferença de ${Math.abs(difference)} unidades passa do limite de ${MAX_QUANTITY} por ajuste.`);
    }
    const type: MovementType = difference > 0 ? "input" : "output";
    const movement = await writeMovement(query, type, context, [{ ...product, quantity: Math.abs(difference) }], reason, "adjustment", null);
    return { type, movement };
  });

  const lowStockThreshold = await getLowStockThreshold(context.companyId);
  await notifyMovement(result.type, context, result.movement.items, lowStockThreshold);
  const [item] = result.movement.items;
  return {
    movementId: result.movement.movementId,
    type: result.type,
    productId: item.productId,
    name: item.name,
    previousStock: item.previousStock,
    newStock: item.newStock,
    difference: countedQuantity - item.previousStock,
  };
}
