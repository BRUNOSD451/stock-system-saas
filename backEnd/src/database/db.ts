import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then((connection) => {
    console.log('Conectado ao MySQL com sucesso!');
    connection.release();
  })
  .catch((error) => {
    console.error('Erro ao conectar ao MySQL:', error.message || error);
  });

// Mantém o contrato do frontend: colunas como product_id chegam como productId.
const toCamelCase = (row: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      value,
    ])
  );

export const db = {
  query: async (text: string, params: any[] = []) => {
    const [result] = await pool.execute(text, params);

    if (Array.isArray(result)) {
      return {
        rows: result.map((row) => toCamelCase(row as Record<string, any>)),
      };
    }

    return { rows: [] };
  },
  // INSERT que devolve o id gerado. Não use SELECT ... LAST_INSERT_ID() pelo pool: cada chamada
  // pode cair em outra conexão e trazer o registro de outra requisição (de outra empresa).
  insert: async (text: string, params: any[] = []): Promise<number> => {
    const [result] = await pool.execute<mysql.ResultSetHeader>(text, params);
    return result.insertId;
  },
  transaction: async <T>(work: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  queryOn: async (connection: mysql.PoolConnection, text: string, params: any[] = []) => {
    const [result] = await connection.execute(text, params);
    if (Array.isArray(result)) {
      return { rows: result.map((row) => toCamelCase(row as Record<string, any>)) };
    }
    return { rows: [] };
  },
};
