import { createHash } from "crypto";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";
import "dotenv/config";

// Executor de migrations em SQL puro. Cada arquivo em backEnd/migrations roda uma única vez,
// em ordem alfabética, e fica registrado na tabela schema_migrations.
//   up        aplica as pendentes
//   status    lista aplicadas e pendentes, sem alterar o banco
//   baseline  marca a 001 (ou até o arquivo informado) como aplicada sem executar,
//             para um banco que já existia antes das migrations

const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");
const TABLE = "schema_migrations";

interface MigrationFile { name: string; sql: string; checksum: string; }
interface AppliedRow { name: string; checksum: string; applied_at: Date; }

function readMigrations(): MigrationFile[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((name) => {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
    });
}

async function connect() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE, DB_PORT } = process.env;
  if (!DB_HOST || !DB_USER || !DB_DATABASE) {
    throw new Error("Defina DB_HOST, DB_USER e DB_DATABASE no backEnd/.env.");
  }
  return mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: Number(DB_PORT) || 3306,
    multipleStatements: true,
  });
}

type Connection = Awaited<ReturnType<typeof connect>>;

async function tableExists(connection: Connection, table: string) {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [table],
  );
  return Number((rows as { total: number }[])[0].total) > 0;
}

async function readApplied(connection: Connection): Promise<Map<string, AppliedRow>> {
  if (!(await tableExists(connection, TABLE))) return new Map();
  const [rows] = await connection.query(`SELECT name, checksum, applied_at FROM ${TABLE} ORDER BY name`);
  return new Map((rows as AppliedRow[]).map((row) => [row.name, row]));
}

async function ensureTable(connection: Connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    name varchar(255) NOT NULL PRIMARY KEY,
    checksum char(64) NOT NULL,
    applied_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

// Uma migration já aplicada não deve ser editada; mudanças vão em um arquivo novo.
function warnChanged(files: MigrationFile[], applied: Map<string, AppliedRow>) {
  for (const file of files) {
    const row = applied.get(file.name);
    if (row && row.checksum !== file.checksum) {
      console.warn(`Aviso: ${file.name} foi alterada depois de aplicada. Crie uma nova migration em vez de editar esta.`);
    }
  }
}

async function up(connection: Connection) {
  const files = readMigrations();
  const applied = await readApplied(connection);

  // Proteção: em um banco antigo sem controle, rodar 001_initial falharia ou duplicaria a estrutura.
  if (applied.size === 0 && (await tableExists(connection, "users"))) {
    throw new Error("O banco já tem tabelas, mas nenhuma migration registrada. Rode `npm run migrate:baseline` uma vez para marcar o estado atual.");
  }

  await ensureTable(connection);
  warnChanged(files, applied);

  const pending = files.filter((file) => !applied.has(file.name));
  if (!pending.length) { console.log("Banco atualizado. Nenhuma migration pendente."); return; }

  for (const file of pending) {
    process.stdout.write(`Aplicando ${file.name}... `);
    // DDL no MySQL não é transacional: o registro só é gravado depois que o arquivo inteiro rodou.
    await connection.query(file.sql);
    await connection.query(`INSERT INTO ${TABLE} (name, checksum) VALUES (?, ?)`, [file.name, file.checksum]);
    console.log("ok");
  }
  console.log(`${pending.length} migration(s) aplicada(s).`);
}

async function status(connection: Connection) {
  const files = readMigrations();
  const applied = await readApplied(connection);
  warnChanged(files, applied);
  for (const file of files) {
    const row = applied.get(file.name);
    console.log(`${row ? "aplicada " : "pendente "} ${file.name}${row ? `  (${new Date(row.applied_at).toLocaleString("pt-BR")})` : ""}`);
  }
  if (!files.length) console.log("Nenhuma migration encontrada em", MIGRATIONS_DIR);
}

// O baseline representa só o banco criado pelo antigo schema.sql (001). Migrations novas
// precisam rodar de verdade, então ficam de fora, a menos que outro alvo seja informado.
async function baseline(connection: Connection) {
  const target = process.argv[3] ?? "001_initial.sql";
  await ensureTable(connection);
  const applied = await readApplied(connection);
  const files = readMigrations().filter((file) => file.name <= target && !applied.has(file.name));
  for (const file of files) {
    await connection.query(`INSERT INTO ${TABLE} (name, checksum) VALUES (?, ?)`, [file.name, file.checksum]);
    console.log(`marcada como aplicada  ${file.name}`);
  }
  if (!files.length) console.log("Todas as migrations já estavam registradas.");
}

async function main() {
  const command = process.argv[2] ?? "up";
  const actions: Record<string, (connection: Connection) => Promise<void>> = { up, status, baseline };
  const action = actions[command];
  if (!action) throw new Error(`Comando desconhecido: ${command}. Use up, status ou baseline.`);

  const connection = await connect();
  try {
    await action(connection);
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error("Falha na migration:", error instanceof Error ? error.message : error);
  process.exit(1);
});
