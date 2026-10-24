import { db } from "../../database/db";
import { AppError, NotFoundError } from "../../utils/errors";
import {
  loadMovementProducts, movementTables, registerStockMovement, stockAfter,
  type MovementItem, type MovementType,
} from "../../services/stockMovementService";
import { getLowStockThreshold } from "../../repository/companiesRepository";
import { clearPendingMovement, savePendingMovement, takePendingMovement } from "../services/pendingMovement";

type Args = Record<string, unknown>;

// Toda ferramenta recebe a empresa e o usuário do token; nenhuma consulta sai da empresa.
// turn: número da mensagem atual do usuário, usado na confirmação de movimentações (pendingMovement).
export type ToolContext = { userId: number; companyId: number; turn?: number };

export type ChatTool = {
  declaration: { name: string; description: string; parameters?: Record<string, unknown> };
  execute(args: Args, context: ToolContext): Promise<unknown>;
};

const MAX_ID = 2147483647;
// Colunas DECIMAL e SUM chegam do mysql2 como string.
const NUMERIC_FIELDS = ["price", "unitPrice", "stockQuantity", "currentStock", "totalUnits", "units", "stockValue", "productCount"];

// ---------- Validação e utilitários ----------

function intArg(args: Args, key: string, options: { min: number; max: number; fallback?: number }) {
  const value = args[key] ?? options.fallback;
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < options.min || value > options.max) {
    throw new AppError(`Informe ${key} como inteiro entre ${options.min} e ${options.max}.`);
  }
  return value;
}

function idArg(args: Args, key: string) {
  const value = intArg(args, key, { min: 1, max: MAX_ID });
  if (value === undefined) throw new AppError(`Informe ${key}.`);
  return value;
}

function stringArg(args: Args, key: string, maxLength: number) {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new AppError(`Informe ${key} como texto.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new AppError(`${key} deve ter no máximo ${maxLength} caracteres.`);
  return trimmed || undefined;
}

function dateArg(args: Args, key: string) {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1000-01-01" || value > "9999-12-30") {
    throw new AppError(`Informe ${key} no formato YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(`${key} não é uma data existente no calendário.`);
  }
  return value;
}

function pageArgs(args: Args, defaultLimit = 20, maxLimit = 50) {
  return {
    limit: intArg(args, "limit", { min: 1, max: maxLimit, fallback: defaultLimit })!,
    offset: intArg(args, "offset", { min: 0, max: MAX_ID, fallback: 0 })!,
  };
}

function numeric(rows: Record<string, any>[]) {
  return rows.map(row => {
    const copy = { ...row };
    for (const key of NUMERIC_FIELDS) if (copy[key] != null) copy[key] = Number(copy[key]);
    return copy;
  });
}

function toPage(rows: Record<string, any>[], limit: number, offset: number) {
  const hasMore = rows.length > limit;
  return { items: numeric(rows.slice(0, limit)), limit, offset, hasMore, ...(hasMore ? { nextOffset: offset + limit } : {}) };
}

const where = (conditions: string[]) => conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
const escapeLike = (value: string) => value.replace(/[\\%_]/g, char => `\\${char}`);

// Datas usam o calendário do MySQL, como o dashboard.
function periodFilter(args: Args, column: string, fallbackDays?: number) {
  const today = args.today ?? false;
  if (typeof today !== "boolean") throw new AppError("Informe today como booleano.");
  const startDate = dateArg(args, "startDate");
  const endDate = dateArg(args, "endDate");
  const explicitDays = intArg(args, "days", { min: 1, max: 3650 });
  const modes = [today, explicitDays !== undefined, startDate !== undefined || endDate !== undefined].filter(Boolean).length;
  if (modes > 1) throw new AppError("Use apenas um filtro de período: today, days ou startDate/endDate.");
  if (startDate && endDate && startDate > endDate) throw new AppError("A data inicial não pode ser posterior à final.");

  const days = modes === 0 ? fallbackDays : explicitDays;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (today) conditions.push(`${column} >= CURRENT_DATE() AND ${column} < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)`);
  if (days !== undefined) {
    conditions.push(`${column} >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY) AND ${column} < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)`);
    params.push(days - 1);
  }
  if (startDate) {
    conditions.push(`${column} >= ?`);
    params.push(startDate);
  }
  if (endDate) {
    conditions.push(`${column} < DATE_ADD(?, INTERVAL 1 DAY)`);
    params.push(endDate);
  }
  const period = today ? { today: true }
    : days !== undefined ? { lastDays: days }
    : startDate || endDate ? { startDate, endDate }
    : { allTime: true };
  return { conditions, params, period };
}

// ---------- Fragmentos de schema ----------

const pageProperties = (defaultLimit = 20, maxLimit = 50) => ({
  limit: { type: "integer", minimum: 1, maximum: maxLimit, description: `Resultados por página. Padrão ${defaultLimit}.` },
  offset: { type: "integer", minimum: 0, description: "Resultados a pular. Para a próxima página use nextOffset. Padrão 0." },
});

const periodProperties = {
  today: { type: "boolean", description: "Somente hoje. Não combinar com days, startDate ou endDate." },
  days: { type: "integer", minimum: 1, maximum: 3650, description: "Últimos N dias corridos, incluindo hoje (7 = última semana)." },
  startDate: { type: "string", description: "Data inicial inclusiva, YYYY-MM-DD." },
  endDate: { type: "string", description: "Data final inclusiva, YYYY-MM-DD." },
};

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: "object", properties, required, additionalProperties: false });

// ---------- Produtos ----------

const productColumns = "p.product_id, p.name, p.price, p.stock_quantity, c.name AS category_name, s.name AS supplier_name";
const productJoins = `FROM products p
  LEFT JOIN categories c ON c.category_id = p.category_id
  LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id`;

export const searchProducts: ChatTool = {
  declaration: {
    name: "searchProducts",
    description: "Busca produtos por parte do nome (sem diferenciar maiúsculas, acentos ou plural simples) e/ou filtra por categoria ou fornecedor. Sem filtros, lista todos em ordem alfabética. Retorna ID, nome, preço atual, saldo, categoria e fornecedor. Use para descobrir o productId antes de qualquer outra consulta ou movimentação.",
    parameters: objectSchema({
      query: { type: "string", maxLength: 100, description: "Trecho do nome, ex.: \"fita isolante\". Todas as palavras precisam aparecer no nome." },
      categoryId: { type: "integer", minimum: 1, description: "Filtra por categoria (IDs em getCategories)." },
      supplierId: { type: "integer", minimum: 1, description: "Filtra por fornecedor (IDs em getSuppliers)." },
      ...pageProperties(),
    }),
  },
  async execute(args, { companyId }) {
    const query = stringArg(args, "query", 100);
    const categoryId = intArg(args, "categoryId", { min: 1, max: MAX_ID });
    const supplierId = intArg(args, "supplierId", { min: 1, max: MAX_ID });
    const { limit, offset } = pageArgs(args);

    const conditions: string[] = ["p.company_id = ?"];
    const params: unknown[] = [companyId];
    const terms = (query ?? "").split(/\s+/).filter(Boolean).slice(0, 6)
      .map(term => term.length > 3 ? term.replace(/s$/i, "") : term);
    for (const term of terms) {
      conditions.push("p.name LIKE ?");
      params.push(`%${escapeLike(term)}%`);
    }
    if (categoryId) {
      conditions.push("p.category_id = ?");
      params.push(categoryId);
    }
    if (supplierId) {
      conditions.push("p.supplier_id = ?");
      params.push(supplierId);
    }
    // Nome exato e prefixo primeiro, para o caso mais provável aparecer no topo.
    const relevance = query ? "CASE WHEN p.name = ? THEN 0 WHEN p.name LIKE ? THEN 1 ELSE 2 END, " : "";
    const relevanceParams = query ? [query, `${escapeLike(query)}%`] : [];

    const { rows } = await db.query(
      `SELECT ${productColumns} ${productJoins} ${where(conditions)}
       ORDER BY ${relevance}p.name, p.product_id LIMIT ? OFFSET ?`,
      [...params, ...relevanceParams, String(limit + 1), String(offset)]
    );
    const page = toPage(rows, limit, offset);
    if (!page.items.length && query) {
      return { ...page, hint: "Nenhum produto encontrado. Tente uma palavra mais curta ou outra grafia antes de concluir que o produto não existe." };
    }
    return page;
  },
};

export const getProductById: ChatTool = {
  declaration: {
    name: "getProductById",
    description: "Detalhes de um produto: nome, descrição, preço atual, saldo, categoria, fornecedor, data de cadastro e datas da última entrada e da última saída.",
    parameters: objectSchema({ productId: { type: "integer", minimum: 1, description: "ID do produto." } }, ["productId"]),
  },
  async execute(args, { companyId }) {
    const productId = idArg(args, "productId");
    const { rows } = await db.query(
      `SELECT p.product_id, p.name, p.description, p.price, p.stock_quantity,
         p.category_id, c.name AS category_name, p.supplier_id, s.name AS supplier_name, p.created_at,
         (SELECT MAX(si.created_at) FROM input_items ii JOIN stock_inputs si ON si.stock_input_id = ii.stock_input_id
           WHERE ii.product_id = p.product_id) AS last_input_at,
         (SELECT MAX(so.created_at) FROM output_items oi JOIN stock_outputs so ON so.stock_output_id = oi.stock_output_id
           WHERE oi.product_id = p.product_id) AS last_output_at
       ${productJoins} WHERE p.product_id = ? AND p.company_id = ?`,
      [productId, companyId]
    );
    if (!rows.length) throw new NotFoundError(`Produto ${productId} não encontrado.`);
    return numeric(rows)[0];
  },
};

export const getLowStockProducts: ChatTool = {
  declaration: {
    name: "getLowStockProducts",
    description: "Lista produtos com saldo menor que o limite de estoque baixo da empresa (o mesmo critério do dashboard e da tela de produtos), incluindo zerados, do menor saldo para o maior, com fornecedor para reposição. Paginado.",
    parameters: objectSchema({
      threshold: { type: "integer", minimum: 1, maximum: 1000000, description: "Limite exclusivo de estoque baixo. Padrão: o limite configurado pela empresa." },
      ...pageProperties(),
    }),
  },
  async execute(args, { companyId }) {
    const threshold = intArg(args, "threshold", { min: 1, max: 1000000 }) ?? await getLowStockThreshold(companyId);
    const { limit, offset } = pageArgs(args);
    const { rows } = await db.query(
      `SELECT ${productColumns} ${productJoins} WHERE p.company_id = ? AND p.stock_quantity < ?
       ORDER BY p.stock_quantity, p.name, p.product_id LIMIT ? OFFSET ?`,
      [companyId, threshold, String(limit + 1), String(offset)]
    );
    return { threshold, ...toPage(rows, limit, offset) };
  },
};

export const getOutOfStockProducts: ChatTool = {
  declaration: {
    name: "getOutOfStockProducts",
    description: "Lista produtos com saldo igual a zero, com fornecedor para reposição. Paginado.",
    parameters: objectSchema(pageProperties()),
  },
  async execute(args, { companyId }) {
    const { limit, offset } = pageArgs(args);
    const { rows } = await db.query(
      `SELECT ${productColumns} ${productJoins} WHERE p.company_id = ? AND p.stock_quantity = 0
       ORDER BY p.name, p.product_id LIMIT ? OFFSET ?`,
      [companyId, String(limit + 1), String(offset)]
    );
    return toPage(rows, limit, offset);
  },
};

// ---------- Indicadores do estoque ----------

export const stockCountTool: ChatTool = {
  declaration: {
    name: "get_stock_count",
    description: "Contagem atual do estoque: registeredProducts (produtos cadastrados), productsInStock (produtos diferentes com saldo positivo), outOfStock (zerados) e totalUnits (soma das unidades).",
  },
  async execute(_args, { companyId }) {
    const { rows } = await db.query(`
      SELECT COUNT(*) AS registered_products,
        COALESCE(SUM(CASE WHEN stock_quantity > 0 THEN 1 ELSE 0 END), 0) AS products_in_stock,
        COALESCE(SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock,
        COALESCE(SUM(stock_quantity), 0) AS total_units
      FROM products
      WHERE company_id = ?
    `, [companyId]);
    return {
      registeredProducts: Number(rows[0].registeredProducts),
      productsInStock: Number(rows[0].productsInStock),
      outOfStock: Number(rows[0].outOfStock),
      totalUnits: Number(rows[0].totalUnits),
    };
  },
};

export const getStockValue: ChatTool = {
  declaration: {
    name: "getStockValue",
    description: "Valor atual do estoque: soma de preço atual × saldo de cada produto, no total ou de uma categoria. Não é faturamento nem custo histórico de compra.",
    parameters: objectSchema({ categoryId: { type: "integer", minimum: 1, description: "Opcional: calcula só para esta categoria." } }),
  },
  async execute(args, { companyId }) {
    const categoryId = intArg(args, "categoryId", { min: 1, max: MAX_ID });
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(price * stock_quantity), 0) AS stock_value, COUNT(*) AS product_count
       FROM products WHERE company_id = ?${categoryId ? " AND category_id = ?" : ""}`,
      categoryId ? [companyId, categoryId] : [companyId]
    );
    return { stockValue: Number(rows[0].stockValue), productCount: Number(rows[0].productCount), currency: "BRL", ...(categoryId ? { categoryId } : {}) };
  },
};

// ---------- Categorias, fornecedores e usuários ----------

export const getCategories: ChatTool = {
  declaration: {
    name: "getCategories",
    description: "Lista categorias com ID, nome e quantidade de produtos cadastrados em cada uma. Paginado.",
    parameters: objectSchema(pageProperties()),
  },
  async execute(args, { companyId }) {
    const { limit, offset } = pageArgs(args);
    const { rows } = await db.query(
      `SELECT c.category_id, c.name, COUNT(p.product_id) AS product_count
       FROM categories c LEFT JOIN products p ON p.category_id = c.category_id AND p.company_id = c.company_id
       WHERE c.company_id = ?
       GROUP BY c.category_id, c.name ORDER BY c.name LIMIT ? OFFSET ?`,
      [companyId, String(limit + 1), String(offset)]
    );
    return toPage(rows, limit, offset);
  },
};

export const getSuppliers: ChatTool = {
  declaration: {
    name: "getSuppliers",
    description: "Lista fornecedores com ID, nome, email, telefone e quantidade de produtos vinculados. Aceita busca por parte do nome. Paginado.",
    parameters: objectSchema({
      query: { type: "string", maxLength: 100, description: "Trecho do nome do fornecedor." },
      ...pageProperties(),
    }),
  },
  async execute(args, { companyId }) {
    const query = stringArg(args, "query", 100);
    const { limit, offset } = pageArgs(args);
    const { rows } = await db.query(
      `SELECT s.supplier_id, s.name, s.email, s.phone, COUNT(p.product_id) AS product_count
       FROM suppliers s LEFT JOIN products p ON p.supplier_id = s.supplier_id AND p.company_id = s.company_id
       WHERE s.company_id = ?${query ? " AND s.name LIKE ?" : ""}
       GROUP BY s.supplier_id, s.name, s.email, s.phone ORDER BY s.name LIMIT ? OFFSET ?`,
      [companyId, ...(query ? [`%${escapeLike(query)}%`] : []), String(limit + 1), String(offset)]
    );
    return toPage(rows, limit, offset);
  },
};

export const getSupplierById: ChatTool = {
  declaration: {
    name: "getSupplierById",
    description: "Consulta nome, email, telefone e quantidade de produtos de um fornecedor pelo ID.",
    parameters: objectSchema({ supplierId: { type: "integer", minimum: 1, description: "ID do fornecedor." } }, ["supplierId"]),
  },
  async execute(args, { companyId }) {
    const supplierId = idArg(args, "supplierId");
    const { rows } = await db.query(
      `SELECT s.supplier_id, s.name, s.email, s.phone,
         (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.supplier_id AND p.company_id = s.company_id) AS product_count
       FROM suppliers s WHERE s.supplier_id = ? AND s.company_id = ?`,
      [supplierId, companyId]
    );
    if (!rows.length) throw new NotFoundError(`Fornecedor ${supplierId} não encontrado.`);
    return numeric(rows)[0];
  },
};

export const getUserById: ChatTool = {
  declaration: {
    name: "getUserById",
    description: "Consulta nome e cargo de um usuário pelo ID. As listagens de movimentação já trazem userName; use esta só se o nome não vier.",
    parameters: objectSchema({ userId: { type: "integer", minimum: 1, description: "ID do usuário." } }, ["userId"]),
  },
  async execute(args, { companyId }) {
    const userId = idArg(args, "userId");
    const { rows } = await db.query("SELECT user_id, user_name, user_position FROM users WHERE user_id = ? AND company_id = ?", [userId, companyId]);
    if (!rows.length) throw new NotFoundError(`Usuário ${userId} não encontrado.`);
    return rows[0];
  },
};

// ---------- Movimentações (consulta) ----------

async function listMovements(type: MovementType, args: Args, companyId: number) {
  const t = movementTables[type];
  const { limit, offset } = pageArgs(args, 10, 50);
  const { conditions, params, period } = periodFilter(args, "m.created_at");
  conditions.unshift("m.company_id = ?");
  params.unshift(companyId);
  const { rows } = await db.query(
    `SELECT m.${t.id}, m.created_at, m.observation, m.user_id, u.user_name,
       COUNT(i.${t.itemId}) AS product_count, COALESCE(SUM(i.quantity), 0) AS total_units
     FROM ${t.table} m
     LEFT JOIN users u ON u.user_id = m.user_id
     LEFT JOIN ${t.items} i ON i.${t.id} = m.${t.id}
     ${where(conditions)}
     GROUP BY m.${t.id}, m.created_at, m.observation, m.user_id, u.user_name
     ORDER BY m.created_at DESC, m.${t.id} DESC LIMIT ? OFFSET ?`,
    [...params, String(limit + 1), String(offset)]
  );
  return { period, ...toPage(rows, limit, offset) };
}

async function getMovementDetails(type: MovementType, id: number, companyId: number) {
  const t = movementTables[type];
  const header = await db.query(
    `SELECT m.${t.id}, m.created_at, m.observation, m.user_id, u.user_name
     FROM ${t.table} m LEFT JOIN users u ON u.user_id = m.user_id WHERE m.${t.id} = ? AND m.company_id = ?`,
    [id, companyId]
  );
  if (!header.rows.length) throw new NotFoundError(`${type === "input" ? "Entrada" : "Saída"} ${id} não encontrada.`);
  const { rows } = await db.query(
    `SELECT i.product_id, p.name, i.quantity${type === "input" ? ", i.unit_price" : ""}, p.stock_quantity AS current_stock
     FROM ${t.items} i LEFT JOIN products p ON p.product_id = i.product_id AND p.company_id = i.company_id
     WHERE i.${t.id} = ? AND i.company_id = ? ORDER BY i.${t.itemId}`,
    [id, companyId]
  );
  const items = numeric(rows);
  return { ...header.rows[0], totalUnits: items.reduce((sum, item) => sum + item.quantity, 0), items };
}

const movementListDescription = (label: string) =>
  `Lista ${label}s de estoque, mais recentes primeiro, com data, observação, responsável (userName), quantidade de produtos e total de unidades de cada uma. Filtre por período com today, days ou startDate/endDate; sem filtro, considera todo o histórico. Não traz os produtos: para isso use os detalhes da ${label} com o ID retornado. Paginado.`;

export const getStockInputs: ChatTool = {
  declaration: {
    name: "getStockInputs",
    description: movementListDescription("entrada"),
    parameters: objectSchema({ ...periodProperties, ...pageProperties(10) }),
  },
  async execute(args, { companyId }) {
    return listMovements("input", args, companyId);
  },
};

export const getStockOutputs: ChatTool = {
  declaration: {
    name: "getStockOutputs",
    description: movementListDescription("saída"),
    parameters: objectSchema({ ...periodProperties, ...pageProperties(10) }),
  },
  async execute(args, { companyId }) {
    return listMovements("output", args, companyId);
  },
};

export const getProductsOfStockInput: ChatTool = {
  declaration: {
    name: "getProductsOfStockInput",
    description: "Detalhes de uma entrada pelo ID: data, observação, responsável e produtos com quantidade, preço unitário registrado na entrada (pode ser nulo) e saldo atual.",
    parameters: objectSchema({ stockInputId: { type: "integer", minimum: 1, description: "ID da entrada." } }, ["stockInputId"]),
  },
  async execute(args, { companyId }) {
    return getMovementDetails("input", idArg(args, "stockInputId"), companyId);
  },
};

export const getProductsOfStockOutput: ChatTool = {
  declaration: {
    name: "getProductsOfStockOutput",
    description: "Detalhes de uma saída pelo ID: data, observação, responsável e produtos com quantidade retirada e saldo atual.",
    parameters: objectSchema({ stockOutputId: { type: "integer", minimum: 1, description: "ID da saída." } }, ["stockOutputId"]),
  },
  async execute(args, { companyId }) {
    return getMovementDetails("output", idArg(args, "stockOutputId"), companyId);
  },
};

export const getProductMovements: ChatTool = {
  declaration: {
    name: "getProductMovements",
    description: "Histórico de entradas e saídas de um produto, mais recentes primeiro, com quantidade, preço unitário da entrada (quando registrado), data, observação e responsável. Aceita filtro de período. Não relaciona lotes de entrada a saídas. Paginado.",
    parameters: objectSchema({
      productId: { type: "integer", minimum: 1, description: "ID do produto." },
      ...periodProperties,
      ...pageProperties(),
    }, ["productId"]),
  },
  async execute(args, { companyId }) {
    const productId = idArg(args, "productId");
    const { limit, offset } = pageArgs(args);
    const { conditions, params, period } = periodFilter(args, "s.created_at");
    const product = await db.query("SELECT product_id, name, stock_quantity FROM products WHERE product_id = ? AND company_id = ?", [productId, companyId]);
    if (!product.rows.length) throw new NotFoundError(`Produto ${productId} não encontrado.`);

    conditions.unshift("s.company_id = ?");
    params.unshift(companyId);
    const filter = ` AND ${conditions.join(" AND ")}`;
    const { rows } = await db.query(
      `SELECT 'entrada' AS movement_type, s.stock_input_id AS movement_id, i.quantity, i.unit_price,
         s.created_at, s.observation, u.user_name
       FROM input_items i JOIN stock_inputs s ON s.stock_input_id = i.stock_input_id
       LEFT JOIN users u ON u.user_id = s.user_id
       WHERE i.product_id = ?${filter}
       UNION ALL
       SELECT 'saida' AS movement_type, s.stock_output_id AS movement_id, i.quantity, NULL AS unit_price,
         s.created_at, s.observation, u.user_name
       FROM output_items i JOIN stock_outputs s ON s.stock_output_id = i.stock_output_id
       LEFT JOIN users u ON u.user_id = s.user_id
       WHERE i.product_id = ?${filter}
       ORDER BY created_at DESC, movement_type, movement_id DESC LIMIT ? OFFSET ?`,
      [productId, ...params, productId, ...params, String(limit + 1), String(offset)]
    );
    return { product: numeric(product.rows)[0], period, ...toPage(rows, limit, offset) };
  },
};

export const getMovementSummary: ChatTool = {
  declaration: {
    name: "getMovementSummary",
    description: "Resumo de movimentações em um período: número de entradas e de saídas registradas (movements), unidades que entraram e saíram (units) e saldo líquido (netUnits). Sem filtro de período, considera todo o histórico.",
    parameters: objectSchema(periodProperties),
  },
  async execute(args, { companyId }) {
    const { conditions, params, period } = periodFilter(args, "m.created_at");
    conditions.unshift("m.company_id = ?");
    params.unshift(companyId);
    const summarize = async (type: MovementType) => {
      const t = movementTables[type];
      const { rows } = await db.query(
        `SELECT COUNT(DISTINCT m.${t.id}) AS movements, COALESCE(SUM(i.quantity), 0) AS units
         FROM ${t.table} m LEFT JOIN ${t.items} i ON i.${t.id} = m.${t.id} ${where(conditions)}`,
        params
      );
      return { movements: Number(rows[0].movements), units: Number(rows[0].units) };
    };
    const [inputs, outputs] = await Promise.all([summarize("input"), summarize("output")]);
    return { period, inputs, outputs, netUnits: inputs.units - outputs.units };
  },
};

export const getMostWithdrawnProducts: ChatTool = {
  declaration: {
    name: "getMostWithdrawnProducts",
    description: "Ranking de produtos pela soma de unidades retiradas (saídas) no período, com saldo atual. Sem filtro, usa os últimos 30 dias incluindo hoje. Não é quantidade de registros nem necessariamente vendas. Paginado.",
    parameters: objectSchema({ ...periodProperties, ...pageProperties() }),
  },
  async execute(args, { companyId }) {
    const { conditions, params, period } = periodFilter(args, "s.created_at", 30);
    conditions.unshift("s.company_id = ?");
    params.unshift(companyId);
    const { limit, offset } = pageArgs(args);
    const { rows } = await db.query(
      `SELECT p.product_id, p.name, SUM(i.quantity) AS total_units, p.stock_quantity
       FROM output_items i
       JOIN stock_outputs s ON s.stock_output_id = i.stock_output_id
       JOIN products p ON p.product_id = i.product_id
       ${where(conditions)}
       GROUP BY p.product_id, p.name, p.stock_quantity
       ORDER BY total_units DESC, p.product_id LIMIT ? OFFSET ?`,
      [...params, String(limit + 1), String(offset)]
    );
    return { period, ...toPage(rows, limit, offset) };
  },
};

// ---------- Movimentações (registro) ----------

function movementTypeArg(value: unknown): MovementType {
  if (value !== "input" && value !== "output") throw new AppError("Informe type como \"input\" (entrada) ou \"output\" (saída).");
  return value;
}

function normalizeItems(type: MovementType, raw: unknown): MovementItem[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) {
    throw new AppError("Informe de 1 a 50 produtos para a movimentação.");
  }
  const merged = new Map<number, MovementItem>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") throw new AppError("Cada item precisa ter productId e quantity.");
    const item = entry as Args;
    const productId = idArg(item, "productId");
    const quantity = intArg(item, "quantity", { min: 1, max: 1000000 });
    if (quantity === undefined) throw new AppError("Informe a quantidade de cada produto.");
    let unitPrice: number | undefined;
    if (item.unitPrice !== undefined && item.unitPrice !== null) {
      if (type !== "input") throw new AppError("unitPrice só pode ser informado em entradas.");
      if (typeof item.unitPrice !== "number" || !Number.isFinite(item.unitPrice) || item.unitPrice < 0 || item.unitPrice > 9999999999.99) {
        throw new AppError("Informe unitPrice como valor numérico não negativo.");
      }
      unitPrice = Math.round(item.unitPrice * 100) / 100;
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
  // Ordem fixa de bloqueio evita deadlock entre movimentações simultâneas.
  return [...merged.values()].sort((a, b) => a.productId - b.productId);
}

// Registro e conferência de saldo usam o mesmo serviço da API (transacional e limitado à empresa).
// Executa a prévia que o usuário viu e confirmou numa mensagem posterior (ver pendingMovement).
async function createStockMovement(type: MovementType, context: ToolContext) {
  if (!Number.isSafeInteger(context.userId) || context.userId <= 0 || !Number.isSafeInteger(context.companyId) || context.companyId <= 0) {
    throw new AppError("Não foi possível identificar o usuário autenticado.", 401);
  }
  const pending = await takePendingMovement(context.userId, type, Number(context.turn));
  const movement = await registerStockMovement(type, context, pending.items, pending.observation);
  return {
    registered: true,
    type: movementTables[type].label,
    ...movement,
    lowStockAfter: type === "output" ? movement.items.filter(item => item.newStock < movement.lowStockThreshold).map(item => item.name) : [],
  };
}

const movementItemSchema = (withPrice: boolean) => ({
  type: "array",
  minItems: 1,
  maxItems: 50,
  items: objectSchema({
    productId: { type: "integer", minimum: 1, description: "ID obtido em searchProducts." },
    quantity: { type: "integer", minimum: 1, maximum: 1000000, description: "Unidades a movimentar." },
    ...(withPrice ? { unitPrice: { type: "number", minimum: 0, description: "Opcional: preço unitário pago nesta entrada, em reais. Informe só se o usuário disser." } } : {}),
  }, ["productId", "quantity"]),
});

export const previewStockMovement: ChatTool = {
  declaration: {
    name: "preview_stock_movement",
    description: "Simula uma entrada ou saída SEM gravar nada: confirma nome de cada produto, saldo atual, saldo após a movimentação, se há estoque suficiente (canExecute) e quais ficarão com estoque baixo. Quando canExecute é true, a prévia fica guardada aguardando a confirmação do usuário; uma nova prévia substitui a anterior. Use sempre antes de pedir a confirmação.",
    parameters: objectSchema({
      type: { type: "string", enum: ["input", "output"], description: "input = entrada, output = saída." },
      items: movementItemSchema(true),
      observation: { type: "string", maxLength: 500, description: "Opcional: motivo, destino ou nota informada pelo usuário. Fica gravada junto com a movimentação." },
    }, ["type", "items"]),
  },
  async execute(args, { companyId, userId, turn }) {
    const type = movementTypeArg(args.type);
    const normalized = normalizeItems(type, args.items);
    const observation = stringArg(args, "observation", 500) ?? null;
    const products = await loadMovementProducts(db.query, companyId, normalized, false);
    const lowStockThreshold = await getLowStockThreshold(companyId);
    const items = products.map(product => {
      const after = stockAfter(type, product.currentStock, product.quantity);
      return {
        productId: product.productId,
        name: product.name,
        quantity: product.quantity,
        ...(product.unitPrice !== undefined ? { unitPrice: product.unitPrice } : {}),
        currentStock: product.currentStock,
        stockAfter: after,
        unit: product.unit,
        ...(after < 0 ? { insufficient: true } : {}),
        ...(!product.active ? { inactive: true } : {}),
        ...(type === "output" && after >= 0 && after < lowStockThreshold ? { lowStockAfter: true } : {}),
      };
    });
    const canExecute = items.every(item => item.stockAfter >= 0 && !item.inactive);
    // Só uma prévia executável fica aguardando; uma inválida apaga a anterior para não registrar algo velho.
    if (canExecute) {
      await savePendingMovement(userId, { type, items: normalized, observation, turn: Number(turn) });
    } else {
      await clearPendingMovement(userId);
    }
    return {
      preview: true,
      type: movementTables[type].label,
      canExecute,
      items,
      ...(observation ? { observation } : {}),
      note: canExecute
        ? "Nada foi registrado. Mostre o resumo ao usuário e pergunte se pode registrar. Só depois que ele responder confirmando, chame a ferramenta de registro (sem argumentos)."
        : "Nada foi registrado e não há o que confirmar: explique ao usuário o que impede (saldo insuficiente ou produto inativo).",
    };
  },
};

export const createStockInput: ChatTool = {
  declaration: {
    name: "create_stock_input",
    description: "Registra a ENTRADA da última prévia (preview_stock_movement) que o usuário confirmou e aumenta o saldo. Não recebe argumentos: os produtos, quantidades e observação são os da prévia. Só funciona depois de o usuário responder confirmando, numa mensagem posterior à prévia. O responsável é o usuário autenticado.",
    parameters: objectSchema({}),
  },
  async execute(_args, context) {
    return createStockMovement("input", context);
  },
};

export const createStockOutput: ChatTool = {
  declaration: {
    name: "create_stock_output",
    description: "Registra a SAÍDA da última prévia (preview_stock_movement) que o usuário confirmou e diminui o saldo; falha sem alterar nada se algum produto ficar sem saldo. Não recebe argumentos: os produtos, quantidades e observação são os da prévia. Só funciona depois de o usuário responder confirmando, numa mensagem posterior à prévia. O responsável é o usuário autenticado.",
    parameters: objectSchema({}),
  },
  async execute(_args, context) {
    return createStockMovement("output", context);
  },
};
