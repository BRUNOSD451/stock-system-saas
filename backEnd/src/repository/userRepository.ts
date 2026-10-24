
import { db } from "../database/db";
import { ConflictError, isForeignKeyError, NotFoundError } from "../utils/errors";
import { userInterface } from "../config/types";

const mapUserField = (field: string) => {
  const map: Record<string, string> = {
    userCellNumber: "user_cell_number",
    userName: "user_name",
    userPosition: "user_position",
    userId: "user_id",
    imageUrl: "image_url",
  };

  return map[field] || field;
};

const userColumns = `
  user_id AS userId,
  company_id AS companyId,
  user_name AS userName,
  user_cell_number AS userCellNumber,
  user_position AS userPosition,
  image_url AS imageUrl,
  must_change_password AS mustChangePassword,
  token_version AS tokenVersion,
  password
`;

// Toda operação é limitada à empresa de quem faz a requisição: companyId vem do token.
export class UserRepository {
  async findAll(companyId: number) {
    const queryText = `SELECT ${userColumns} FROM users WHERE company_id = ? ORDER BY user_name`;
    const result = await db.query(queryText, [companyId]);
    return result.rows as userInterface[];
  }

  async findById(companyId: number, id: number) {
    const queryText = `SELECT ${userColumns} FROM users WHERE user_id = ? AND company_id = ?`;
    const result = await db.query(queryText, [id, companyId]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    return result.rows[0] as userInterface;
  }

  async create(companyId: number, user: userInterface) {
    const queryText = `INSERT INTO users (company_id, user_name, user_cell_number, user_position, password, must_change_password, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const values = [companyId, user.userName, user.userCellNumber, user.userPosition, user.password, user.mustChangePassword ? 1 : 0, user.imageUrl ?? null];

    const userId = await db.insert(queryText, values);

    return this.findById(companyId, userId);
  }

  // Troca a senha (já com hash). mustChange = true para senha provisória gerada pelo administrador.
  // token_version sobe junto: as sessões abertas com a senha anterior deixam de valer.
  async setPassword(companyId: number, id: number, passwordHash: string, mustChange: boolean) {
    await this.findById(companyId, id);
    await db.query(
      `UPDATE users SET password = ?, must_change_password = ?, token_version = token_version + 1 WHERE user_id = ? AND company_id = ?`,
      [passwordHash, mustChange ? 1 : 0, id, companyId],
    );
    return this.findById(companyId, id);
  }

  async delete(companyId: number, id: number) {
    // Confirma que o usuário é da empresa antes de excluir; de outra empresa responde 404.
    await this.findById(companyId, id);

    const queryText = `DELETE FROM users WHERE user_id = ? AND company_id = ?`;
    try {
      await db.query(queryText, [id, companyId]);
    } catch (error: unknown) {
      if (isForeignKeyError(error)) {
        throw new ConflictError("Não é possível excluir este usuário porque ele possui movimentações registradas.");
      }
      throw error;
    }
  }

  async update(companyId: number, updateData: any, id: number) {
    // company_id não está na lista: um usuário nunca muda de empresa por esta rota.
    const allowedFields = [
      "imageUrl",
      "password",
      "userCellNumber",
      "userName",
      "userPosition",
    ] as const;

    const fields = allowedFields.filter((field) => updateData[field] !== undefined);

    if (fields.length === 0) {
      throw new NotFoundError("No fields to update");
    }

    await this.findById(companyId, id);

    const values: any[] = fields.map((field) => updateData[field]);
    const assignments = fields.map((field) => `${mapUserField(field)} = ?`);

    values.push(id, companyId);

    const queryText = `UPDATE users SET ${assignments.join(", ")} WHERE user_id = ? AND company_id = ?`;
    await db.query(queryText, values);

    return this.findById(companyId, id);
  }
}
