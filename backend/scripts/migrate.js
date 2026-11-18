import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const EXPECTED_DATABASE = "elo360_auth_staging_db";
const MIGRATIONS = [
  "001_initial",
  "002_auth_sessions",
  "003_tenant_rls",
  "004_tenant_relationships",
  "005_mfa_recovery",
  "006_mfa_challenge",
  "007_exclusive_owner",
  "008_financial_accounts_funds",
];

function refuse(message) {
  throw new Error(message);
}

function databaseConfig(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    refuse("DATABASE_URL inválida.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    refuse("DATABASE_URL deve apontar para PostgreSQL.");
  }
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (databaseName !== EXPECTED_DATABASE) {
    refuse("DATABASE_URL não aponta para o banco isolado de homologação.");
  }

  // Render private-network hostnames are short (no public DNS suffix).
  // Public/external hosts must use verified TLS; never silently downgrade.
  if (/pooler|pgbouncer/i.test(url.hostname)) {
    refuse("Use a conexão direta do PostgreSQL; o executor depende de advisory lock por sessão.");
  }
  const isPublicHost = url.hostname.includes(".");
  for (const key of ["sslmode", "ssl", "uselibpqcompat"]) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: isPublicHost ? { rejectUnauthorized: true } : false,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    application_name: "elo360-staging-migrations",
  };
}

async function main() {
  if (process.env.ALLOW_MIGRATION !== "YES") {
    refuse("Execução bloqueada. Defina ALLOW_MIGRATION=YES somente na execução manual autorizada.");
  }
  if (process.env.MIGRATION_TARGET !== EXPECTED_DATABASE) {
    refuse("Execução bloqueada. MIGRATION_TARGET deve ser elo360_auth_staging_db.");
  }
  if (!process.env.DATABASE_URL) refuse("DATABASE_URL não está configurada.");

  const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db");
  const client = new pg.Client(databaseConfig(process.env.DATABASE_URL));
  let connected = false;
  let locked = false;

  try {
    await client.connect();
    connected = true;

    const identity = await client.query(
      "SELECT current_database() AS database_name, current_user AS database_user, " +
      "pg_is_in_recovery() AS standby, current_setting('transaction_read_only') AS read_only"
    );
    const db = identity.rows[0];
    if (db.database_name !== EXPECTED_DATABASE) refuse("Banco conectado não corresponde ao destino autorizado.");
    if (db.standby || db.read_only === "on") refuse("Banco em modo somente leitura; migração cancelada.");

    const lockResult = await client.query("SELECT pg_try_advisory_lock(70360, 8) AS acquired");
    locked = lockResult.rows[0].acquired;
    if (!locked) refuse("Outra execução de migrações já está em andamento.");

    const tracking = await client.query("SELECT to_regclass('elo.schema_migrations') AS relation");
    let applied = [];
    if (tracking.rows[0].relation) {
      const result = await client.query(
        "SELECT version FROM elo.schema_migrations ORDER BY version"
      );
      applied = result.rows.map(row => row.version);
      const unknown = applied.filter(version => !MIGRATIONS.includes(version));
      if (unknown.length) refuse("Há versões desconhecidas no controle de migrações; intervenção manual necessária.");

      // Applied versions must be a contiguous prefix. Never fill a gap under an
      // unknown schema state because later migrations may depend on earlier DDL.
      const expectedPrefix = MIGRATIONS.slice(0, applied.length);
      if (applied.length !== expectedPrefix.length ||
          expectedPrefix.some((version, index) => version !== applied[index])) {
        refuse("Histórico de migrações incompleto ou fora de ordem; execução cancelada.");
      }
    } else {
      const existing = await client.query(
        "SELECT count(*)::int AS relations " +
        "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace " +
        "WHERE n.nspname NOT IN ('pg_catalog','information_schema') " +
        "AND n.nspname NOT LIKE 'pg_toast%' " +
        "AND c.relkind IN ('r','p','v','m','S')"
      );
      if (existing.rows[0].relations !== 0) {
        refuse("Banco sem controle de migrações, mas com objetos existentes. Não será tratado como banco vazio.");
      }
    }

    for (const version of MIGRATIONS) {
      if (applied.includes(version)) {
        console.log("Já aplicada:", version);
        continue;
      }

      const filename = path.join(migrationsDir, version + ".sql");
      const sql = await fs.readFile(filename, "utf8");
      if (!/^\s*(?:--[^\r\n]*\r?\n\s*)*BEGIN;\s*$/m.test(sql) ||
          !/\bCOMMIT;\s*$/.test(sql)) {
        refuse("Arquivo sem transação explícita ou incompleto: " + version);
      }

      // Each reviewed SQL file owns its BEGIN/COMMIT transaction.
      await client.query(sql);
      const confirmation = await client.query(
        "SELECT 1 FROM elo.schema_migrations WHERE version = $1",
        [version]
      );
      if (confirmation.rowCount !== 1) {
        refuse("A migração não registrou sua conclusão: " + version);
      }
      console.log("Aplicada e registrada:", version);
    }

    const finalResult = await client.query(
      "SELECT version FROM elo.schema_migrations ORDER BY version"
    );
    const finalVersions = finalResult.rows.map(row => row.version);
    if (finalVersions.length !== MIGRATIONS.length ||
        MIGRATIONS.some((version, index) => finalVersions[index] !== version)) {
      refuse("A conferência final não encontrou exatamente as oito migrações.");
    }

    console.log("SUCESSO: oito migrações verificadas no banco isolado de homologação.");
    console.log("Banco:", EXPECTED_DATABASE);
    console.log("Versões:", finalVersions.join(", "));
  } finally {
    if (locked) {
      await client.query("SELECT pg_advisory_unlock(70360, 8)").catch(() => {});
    }
    if (connected) await client.end().catch(() => {});
  }
}

main().catch(error => {
  // Do not print DATABASE_URL or credentials.
  console.error("Migração interrompida:", error.message || "erro não identificado");
  process.exitCode = 1;
});
