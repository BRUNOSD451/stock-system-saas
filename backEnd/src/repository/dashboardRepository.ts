import { db } from "../database/db";

// Fluxo do estoque = movimentações comuns que não foram estornadas. Estornos e ajustes de inventário
// são correções: entram no saldo, mas não contam como recebimento ou retirada no dashboard.
const regularInputs = `s.kind = 'regular' AND NOT EXISTS (SELECT 1 FROM stock_outputs r WHERE r.reverses_input_id = s.stock_input_id)`;
const regularOutputs = `s.kind = 'regular' AND NOT EXISTS (SELECT 1 FROM stock_inputs r WHERE r.reverses_output_id = s.stock_output_id)`;

// Todos os indicadores são calculados só com os dados da empresa do token.
class DashboardRepository {
  // Unidades e valor contam todo o estoque físico; catálogo e estoque baixo, só produtos ativos.
  async getSumary(companyId: number) {
    const { rows } = await db.query(`
      SELECT COALESCE(SUM(active = 1), 0) AS products,
        COALESCE(SUM(stock_quantity), 0) AS in_stock,
        COALESCE(SUM(CASE WHEN active = 1 AND stock_quantity < (SELECT low_stock_threshold FROM companies WHERE company_id = ?) THEN 1 ELSE 0 END), 0) AS low_stock,
        COALESCE(SUM(price * stock_quantity), 0) AS stock_value
      FROM products
      WHERE company_id = ?
    `, [companyId, companyId]);
    const row = rows[0];
    return {
      products: Number(row.products),
      inStock: Number(row.inStock),
      lowStock: Number(row.lowStock),
      stockValue: Number(row.stockValue),
    };
  }

  async getMovements(companyId: number) {
    // Datas e limites usam o mesmo calendário do MySQL, inclusive em dias sem itens.
    const { rows } = await db.query(`
      SELECT DATE_FORMAT(days.day, '%Y-%m-%d') AS day,
        COALESCE(entries.quantity, 0) AS entries,
        COALESCE(outputs.quantity, 0) AS outputs
      FROM (
        SELECT DATE_SUB(CURRENT_DATE(), INTERVAL offsets.n DAY) AS day
        FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2
          UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) offsets
      ) days
      LEFT JOIN (
        SELECT DATE(s.created_at) AS day, SUM(i.quantity) AS quantity
        FROM stock_inputs s JOIN input_items i ON i.stock_input_id = s.stock_input_id
        WHERE s.company_id = ? AND ${regularInputs}
          AND s.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
          AND s.created_at < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)
        GROUP BY DATE(s.created_at)
      ) entries ON entries.day = days.day
      LEFT JOIN (
        SELECT DATE(s.created_at) AS day, SUM(i.quantity) AS quantity
        FROM stock_outputs s JOIN output_items i ON i.stock_output_id = s.stock_output_id
        WHERE s.company_id = ? AND ${regularOutputs}
          AND s.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
          AND s.created_at < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)
        GROUP BY DATE(s.created_at)
      ) outputs ON outputs.day = days.day
      ORDER BY days.day
    `, [companyId, companyId]);
    return rows.map(row => ({
      day: String(row.day), entries: Number(row.entries), outputs: Number(row.outputs),
    }));
  }

  private async getFlow(companyId: number, type: "input" | "output") {
    // O nome da tabela é definido apenas pelas chamadas internas abaixo.
    const { rows } = await db.query(`
      SELECT COALESCE(SUM(CASE WHEN s.created_at >= CURRENT_DATE() THEN i.quantity ELSE 0 END), 0) AS today,
        COALESCE(SUM(i.quantity), 0) AS month
      FROM stock_${type}s s
      JOIN ${type}_items i ON i.stock_${type}_id = s.stock_${type}_id
      WHERE s.company_id = ? AND ${type === "input" ? regularInputs : regularOutputs}
        AND s.created_at >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
        AND s.created_at < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)
    `, [companyId]);
    return { today: Number(rows[0].today), month: Number(rows[0].month) };
  }

  getEntries(companyId: number) { return this.getFlow(companyId, "input"); }
  getOutputs(companyId: number) { return this.getFlow(companyId, "output"); }
}

export const dashboardRepository = new DashboardRepository();
