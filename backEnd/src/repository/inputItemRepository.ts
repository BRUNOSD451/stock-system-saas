import { db } from "../database/db";

// Itens são gravados por services/stockMovementService junto com a entrada; aqui só a leitura.
export class InputItemRepository {
  async findAll(companyId: number) {
    const result = await db.query("SELECT * FROM input_items WHERE company_id = ?", [companyId]);
    return result.rows;
  }
}
