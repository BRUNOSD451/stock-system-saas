import { db } from "../database/db";
import { AppError, ConflictError, isForeignKeyError, NotFoundError } from "../utils/errors";

const DUPLICATE_SKU = "Já existe um produto com esse código nesta empresa.";

const isDuplicateEntry = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";

// Toda operação é limitada à empresa de quem faz a requisição: companyId vem do token.
// Alterações de saldo por movimentação ficam em services/stockMovementService.
export class ProductsRepository {
  async findAll(companyId: number) {
    const result = await db.query("SELECT * FROM products WHERE company_id = ? ORDER BY name", [companyId]);
    return result.rows;
  }

  async findById(companyId: number, id: number) {
    const result = await db.query("SELECT * FROM products WHERE product_id = ? AND company_id = ?", [id, companyId]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Produto não encontrado.");
    }

    return result.rows[0];
  }

  // Categoria e fornecedor informados precisam ser da mesma empresa do produto.
  private async assertReferences(companyId: number, categoryId: unknown, supplierId: unknown) {
    if (categoryId !== undefined) {
      const category = await db.query("SELECT category_id FROM categories WHERE category_id = ? AND company_id = ?", [Number(categoryId), companyId]);
      if (category.rows.length === 0) throw new AppError("Selecione uma categoria válida.", 400);
    }

    if (supplierId !== undefined && supplierId !== null) {
      const supplier = await db.query("SELECT supplier_id FROM suppliers WHERE supplier_id = ? AND company_id = ?", [Number(supplierId), companyId]);
      if (supplier.rows.length === 0) throw new AppError("Selecione um fornecedor válido.", 400);
    }
  }

  async create(companyId: number, newProduct: any) {
    await this.assertReferences(companyId, newProduct.categoryId ?? null, newProduct.supplierId);

    let productId: number;
    try {
      productId = await db.insert(
        "INSERT INTO products (company_id, name, sku, description, price, stock_quantity, unit, category_id, supplier_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [companyId, newProduct.name, newProduct.sku ?? null, newProduct.description, newProduct.price, newProduct.stockQuantity, newProduct.unit ?? "un", newProduct.categoryId, newProduct.supplierId, newProduct.imageUrl || null]
      );
    } catch (error: unknown) {
      if (isDuplicateEntry(error)) throw new ConflictError(DUPLICATE_SKU);
      throw error;
    }

    return this.findById(companyId, productId);
  }

  async setActive(companyId: number, id: number, active: boolean) {
    await this.findById(companyId, id);
    await db.query("UPDATE products SET active = ? WHERE product_id = ? AND company_id = ?", [active ? 1 : 0, id, companyId]);
    return this.findById(companyId, id);
  }

  async delete(companyId: number, id: number) {
    const existing = await this.findById(companyId, id);

    try {
      await db.query("DELETE FROM products WHERE product_id = ? AND company_id = ?", [id, companyId]);
    } catch (error: unknown) {
      if (isForeignKeyError(error)) {
        throw new ConflictError("Não é possível excluir este produto porque ele possui movimentações de estoque.");
      }
      throw error;
    }
    return existing;
  }

  async update(companyId: number, updateData: any, id: number) {
    await this.findById(companyId, id);
    await this.assertReferences(companyId, updateData.categoryId, updateData.supplierId);

    // Apenas os campos previstos podem formar o SQL; os valores seguem parametrizados.
    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.name !== undefined) {
      fields.push("name = ?");
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      fields.push("description = ?");
      values.push(updateData.description);
    }
    if (updateData.price !== undefined) {
      fields.push("price = ?");
      values.push(updateData.price);
    }
    // stock_quantity não está aqui: o saldo só muda por movimentação ou ajuste (stockMovementService).
    if (updateData.sku !== undefined) {
      fields.push("sku = ?");
      values.push(updateData.sku);
    }
    if (updateData.unit !== undefined) {
      fields.push("unit = ?");
      values.push(updateData.unit);
    }
    if (updateData.categoryId !== undefined) {
      fields.push("category_id = ?");
      values.push(updateData.categoryId);
    }
    if (updateData.supplierId !== undefined) {
      fields.push("supplier_id = ?");
      values.push(updateData.supplierId);
    }
    if (updateData.imageUrl !== undefined) {
      fields.push("image_url = ?");
      values.push(updateData.imageUrl);
    }

    if (fields.length === 0) {
      throw new NotFoundError("No fields to update");
    }

    values.push(id, companyId);
    const query = `UPDATE products SET ${fields.join(", ")} WHERE product_id = ? AND company_id = ?`;
    try {
      await db.query(query, values);
    } catch (error: unknown) {
      if (isDuplicateEntry(error)) throw new ConflictError(DUPLICATE_SKU);
      throw error;
    }

    return this.findById(companyId, id);
  }
}
