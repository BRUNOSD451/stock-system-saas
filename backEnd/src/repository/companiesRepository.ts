import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import { db } from "../database/db";
import { companyInterface, userInterface } from "../config/types";
import type { PlanId } from "../config/plans";
import { NotFoundError } from "../utils/errors";

const companyColumns = `
  company_id AS companyId,
  name,
  email,
  logo_url AS logoUrl,
  plan,
  status,
  trial_ends_at AS trialEndsAt,
  current_period_end AS currentPeriodEnd,
  low_stock_threshold AS lowStockThreshold,
  owner_user_id AS ownerUserId,
  created_at AS createdAt
`;

const userColumns = `
  user_id AS userId,
  user_name AS userName,
  user_cell_number AS userCellNumber,
  user_position AS userPosition,
  image_url AS imageUrl,
  password
`;

export interface NewCompany {
  name: string;
  email: string;
  trialEndsAt: Date;
}

export interface NewOwner {
  userName: string;
  userCellNumber: string;
  password: string;
}

// As escritas recebem a conexão da transação: empresa e administrador são criados juntos ou nenhum dos dois.
// Ordem: empresa (sem dono) → administrador com company_id → dono gravado na empresa.
export class CompaniesRepository {
  async createOn(connection: PoolConnection, company: NewCompany) {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO companies (name, email, plan, status, trial_ends_at) VALUES (?, ?, 'free', 'trial', ?)`,
      [company.name, company.email, company.trialEndsAt],
    );
    return result.insertId;
  }

  async createOwnerOn(connection: PoolConnection, companyId: number, owner: NewOwner) {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (company_id, user_name, user_cell_number, user_position, password) VALUES (?, ?, ?, 'administrador', ?)`,
      [companyId, owner.userName, owner.userCellNumber, owner.password],
    );
    const created = await db.queryOn(connection, `SELECT ${userColumns} FROM users WHERE user_id = ?`, [result.insertId]);
    return created.rows[0] as userInterface;
  }

  async setOwnerOn(connection: PoolConnection, companyId: number, ownerUserId: number) {
    await connection.execute(`UPDATE companies SET owner_user_id = ? WHERE company_id = ?`, [ownerUserId, companyId]);
    const updated = await db.queryOn(connection, `SELECT ${companyColumns} FROM companies WHERE company_id = ?`, [companyId]);
    return updated.rows[0] as companyInterface;
  }

  async findById(companyId: number) {
    const result = await db.query(`SELECT ${companyColumns} FROM companies WHERE company_id = ?`, [companyId]);
    if (result.rows.length === 0) throw new NotFoundError("Empresa não encontrada.");
    return result.rows[0] as companyInterface;
  }

  // Plano e situação da assinatura: só a cobrança (billingService) altera.
  // Pagamento confirmado: plano ativo por `months` meses a partir de agora. DATE_ADD do MySQL
  // respeita o calendário (31/jan + 1 mês = 28 ou 29/fev).
  async activateSubscription(companyId: number, plan: PlanId, months: number) {
    await db.query(
      `UPDATE companies SET plan = ?, status = 'active', current_period_end = DATE_ADD(NOW(), INTERVAL ? MONTH) WHERE company_id = ?`,
      [plan, months, companyId],
    );
    return this.findById(companyId);
  }

  // Só os dados que o administrador pode editar; plano, status e dono mudam por outros fluxos.
  async update(companyId: number, data: CompanyUpdate) {
    const columns: Record<keyof CompanyUpdate, string> = {
      name: "name",
      email: "email",
      logoUrl: "logo_url",
      lowStockThreshold: "low_stock_threshold",
    };
    const fields = (Object.keys(columns) as (keyof CompanyUpdate)[]).filter((field) => data[field] !== undefined);
    if (fields.length) {
      await db.query(
        `UPDATE companies SET ${fields.map((field) => `${columns[field]} = ?`).join(", ")} WHERE company_id = ?`,
        [...fields.map((field) => data[field]), companyId],
      );
    }
    return this.findById(companyId);
  }
}

export interface CompanyUpdate {
  name?: string;
  email?: string;
  logoUrl?: string | null;
  lowStockThreshold?: number;
}

// Limite de estoque baixo da empresa: usado na tela de produtos, no dashboard, nos avisos e no chat.
export async function getLowStockThreshold(companyId: number) {
  const result = await db.query(`SELECT low_stock_threshold AS lowStockThreshold FROM companies WHERE company_id = ?`, [companyId]);
  return Number(result.rows[0]?.lowStockThreshold ?? 10);
}
