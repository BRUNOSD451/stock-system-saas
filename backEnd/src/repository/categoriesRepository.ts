import { db } from "../database/db";
import { AppError, ConflictError, isForeignKeyError, NotFoundError } from "../utils/errors";

function isDuplicateEntry(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

// Toda operação é limitada à empresa de quem faz a requisição: companyId vem do token.
export class CategoryRepository {
  async findAll(companyId: number) {
    const result = await db.query("SELECT * FROM categories WHERE company_id = ? ORDER BY name", [companyId]);
    return result.rows;
  }

  async findById(companyId: number, id: number) {
    const result = await db.query("SELECT * FROM categories WHERE category_id = ? AND company_id = ?", [id, companyId]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Categoria não encontrada.");
    }

    return result.rows[0];
  }

  async delete(companyId: number, id: number) {
    const existing = await this.findById(companyId, id);

    try {
      await db.query("DELETE FROM categories WHERE category_id = ? AND company_id = ?", [id, companyId]);
    } catch (error: unknown) {
      if (isForeignKeyError(error)) {
        throw new ConflictError("Não é possível excluir esta categoria porque ela está associada a produtos.");
      }
      throw error;
    }
    return existing;
  }

  async create(companyId: number, data: any) {
    let categoryId: number;
    try {
      categoryId = await db.insert("INSERT INTO categories (company_id, name) VALUES (?, ?)", [companyId, data.name]);
    } catch (error: unknown) {
      if (isDuplicateEntry(error)) throw new AppError("Já existe uma categoria com esse nome.", 409);
      throw error;
    }

    return this.findById(companyId, categoryId);
  }

  async update(companyId: number, updateData: any, id: number) {
    if (updateData.name === undefined) {
      throw new NotFoundError("No fields to update");
    }

    await this.findById(companyId, id);

    try {
      await db.query("UPDATE categories SET name = ? WHERE category_id = ? AND company_id = ?", [updateData.name, id, companyId]);
    } catch (error: unknown) {
      if (isDuplicateEntry(error)) throw new AppError("Já existe uma categoria com esse nome.", 409);
      throw error;
    }

    return this.findById(companyId, id);
  }
}
