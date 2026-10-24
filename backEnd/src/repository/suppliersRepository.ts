import { db } from "../database/db";
import { ConflictError, isForeignKeyError, NotFoundError } from "../utils/errors";

// Toda operação é limitada à empresa de quem faz a requisição: companyId vem do token.
export class SuppliersRepository {
  async findAll(companyId: number) {
    const result = await db.query("SELECT * FROM suppliers WHERE company_id = ? ORDER BY name", [companyId]);
    return result.rows;
  }

  async findById(companyId: number, id: number) {
    const result = await db.query("SELECT * FROM suppliers WHERE supplier_id = ? AND company_id = ?", [id, companyId]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Fornecedor não encontrado.");
    }

    return result.rows[0];
  }

  async create(companyId: number, newSupplier: any) {
    const supplierId = await db.insert(
      "INSERT INTO suppliers (company_id, name, email, phone) VALUES (?, ?, ?, ?)",
      [companyId, newSupplier.name, newSupplier.email, newSupplier.phone]
    );

    return this.findById(companyId, supplierId);
  }

  async delete(companyId: number, id: number) {
    const existing = await this.findById(companyId, id);

    try {
      await db.query("DELETE FROM suppliers WHERE supplier_id = ? AND company_id = ?", [id, companyId]);
    } catch (error: unknown) {
      if (isForeignKeyError(error)) {
        throw new ConflictError("Não é possível excluir este fornecedor porque ele está associado a produtos.");
      }
      throw error;
    }
    return existing;
  }

  async update(companyId: number, updateData: any, id: number) {
    const allowedFields = ["name", "email", "phone"] as const;
    const fields = allowedFields.filter((field) => updateData[field] !== undefined);

    if (fields.length === 0) {
      throw new NotFoundError("No fields to update");
    }

    await this.findById(companyId, id);

    const values = fields.map((field) => updateData[field]);
    const assignments = fields.map((field) => `${field} = ?`);
    values.push(id, companyId);

    await db.query(`UPDATE suppliers SET ${assignments.join(", ")} WHERE supplier_id = ? AND company_id = ?`, values);

    return this.findById(companyId, id);
  }
}
