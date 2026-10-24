import { db } from "../database/db";

// Itens são gravados por services/stockMovementService junto com a saída; aqui só a leitura.
export class OutputItemRepository {
  async findAll(companyId: number) {
    const result = await db.query("SELECT * FROM output_items WHERE company_id = ?", [companyId]);
    return result.rows;
  }
}
