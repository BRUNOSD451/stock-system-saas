import { db } from "../database/db";
import { ConflictError, isForeignKeyError, NotFoundError } from "../utils/errors";

// Toda leitura e exclusão é limitada à empresa do token. O registro de novas movimentações
// fica em services/stockMovementService (transacional, compartilhado com o chatbot).
export class StockOutputRepository {
  async findById(companyId: number, id: number) {
    const movement = await db.query("SELECT * FROM stock_outputs WHERE stock_output_id = ? AND company_id = ?", [id, companyId]);
    if (!movement.rows.length) throw new NotFoundError("Saída não encontrada.");

    const { rows } = await db.query(`
      SELECT i.*, p.product_id AS linked_product_id, p.name, p.description,
        p.price, p.stock_quantity, p.category_id, p.supplier_id, p.image_url,
        p.created_at AS product_created_at
      FROM output_items i
      LEFT JOIN products p ON p.product_id = i.product_id AND p.company_id = i.company_id
      WHERE i.stock_output_id = ? AND i.company_id = ?
      ORDER BY i.output_item_id
    `, [id, companyId]);

    const items = rows.map(row => ({
      outputItemId: row.outputItemId,
      stockOutputId: row.stockOutputId,
      productId: row.productId,
      quantity: Number(row.quantity),
      
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

  // reversedById: a entrada que estornou esta saída, se houver.
  async findAll(companyId: number) {
    const result = await db.query(`
      SELECT s.*, r.stock_input_id AS reversed_by_id
      FROM stock_outputs s
      LEFT JOIN stock_inputs r ON r.reverses_output_id = s.stock_output_id AND r.company_id = s.company_id
      WHERE s.company_id = ?
      ORDER BY s.stock_output_id DESC`, [companyId]);
    return result.rows;
  }

  async delete(companyId: number, id: number) {
    const existing = await db.query("SELECT * FROM stock_outputs WHERE stock_output_id = ? AND company_id = ?", [id, companyId]);

    if (existing.rows.length === 0) {
      throw new NotFoundError("Stock output not found");
    }

    try {
      await db.query("DELETE FROM stock_outputs WHERE stock_output_id = ? AND company_id = ?", [id, companyId]);
    } catch (error: unknown) {
      if (isForeignKeyError(error)) {
        throw new ConflictError("Não é possível excluir esta saída porque ela possui itens vinculados.");
      }
      throw error;
    }
    return existing.rows[0];
  }
}
