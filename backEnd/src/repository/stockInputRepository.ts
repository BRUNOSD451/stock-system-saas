import { db } from "../database/db";
import { ConflictError, isForeignKeyError, NotFoundError } from "../utils/errors";

// Toda leitura e exclusão é limitada à empresa do token. O registro de novas movimentações
// fica em services/stockMovementService (transacional, compartilhado com o chatbot).
export class StockInputRepository {
  async findById(companyId: number, id: number) {
    const movement = await db.query("SELECT * FROM stock_inputs WHERE stock_input_id = ? AND company_id = ?", [id, companyId]);
    if (!movement.rows.length) throw new NotFoundError("Entrada não encontrada.");

    const { rows } = await db.query(`
      SELECT i.*, p.product_id AS linked_product_id, p.name, p.description,
        p.price, p.stock_quantity, p.category_id, p.supplier_id, p.image_url,
        p.created_at AS product_created_at
      FROM input_items i
      LEFT JOIN products p ON p.product_id = i.product_id AND p.company_id = i.company_id
      WHERE i.stock_input_id = ? AND i.company_id = ?
      ORDER BY i.input_item_id
    `, [id, companyId]);

    const items = rows.map(row => ({
      inputItemId: row.inputItemId,
      stockInputId: row.stockInputId,
      productId: row.productId,
      quantity: Number(row.quantity),
      unitPrice: row.unitPrice == null ? null : Number(row.unitPrice),
      createdAt: row.createdAt,
      product: row.linkedProductId == null ? null : {
        productId: row.linkedProductId,
        name: row.name,
        description: row.description,
        price: Number(row.price),
        stockQuantity: Number(row.stockQuantity),
        categoryId: row.categoryId,
        supplierId: row.supplierId,
        imageUrl: row.imageUrl,
        createdAt: row.productCreatedAt,
      },
    }));
    return { ...movement.rows[0], items };
  }

  // reversedById: a saída que estornou esta entrada, se houver.
  async findAll(companyId: number) {
    const result = await db.query(`
      SELECT s.*, r.stock_output_id AS reversed_by_id
      FROM stock_inputs s
      LEFT JOIN stock_outputs r ON r.reverses_input_id = s.stock_input_id AND r.company_id = s.company_id
      WHERE s.company_id = ?
      ORDER BY s.stock_input_id DESC`, [companyId]);
    return result.rows;
  }

  async findPage(companyId: number, options: { today: boolean; startDate?: string; endDate?: string; limit: number; offset: number }) {
    const conditions: string[] = ["company_id = ?"];
    const params: string[] = [String(companyId)];
    if (options.today) {
      conditions.push("created_at >= CURRENT_DATE() AND created_at < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)");
    } else {
      if (options.startDate) {
        conditions.push("created_at >= ?");
        params.push(options.startDate);
      }
      if (options.endDate) {
        conditions.push("created_at < DATE_ADD(?, INTERVAL 1 DAY)");
        params.push(options.endDate);
      }
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await db.query(
      `SELECT stock_input_id, user_id, observation, created_at FROM stock_inputs ${where}
       ORDER BY created_at DESC, stock_input_id DESC LIMIT ? OFFSET ?`,
      [...params, String(options.limit + 1), String(options.offset)]
    );
    return { items: rows.slice(0, options.limit), limit: options.limit, offset: options.offset, hasMore: rows.length > options.limit };
  }

  async delete(companyId: number, id: number) {
    const existing = await db.query("SELECT * FROM stock_inputs WHERE stock_input_id = ? AND company_id = ?", [id, companyId]);

    if (existing.rows.length === 0) {
      throw new NotFoundError("Stock input not found");
    }

    try {
      await db.query("DELETE FROM stock_inputs WHERE stock_input_id = ? AND company_id = ?", [id, companyId]);
    } catch (error: unknown) {
      if (isForeignKeyError(error)) {
        throw new ConflictError("Não é possível excluir esta entrada porque ela possui itens vinculados.");
      }
      throw error;
    }
    return existing.rows[0];
  }
}
