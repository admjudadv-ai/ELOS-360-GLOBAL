// ELO 360 Global: leitura de prontidão do PostgreSQL, sem alterar tabelas.
// DATABASE_URL deve ser configurada somente no ambiente seguro de execução.
import pg from 'pg';
import {safeConnectionDiagnostic} from '../connection-diagnostic.js';

const {DATABASE_URL}=process.env;
if(!DATABASE_URL)throw new Error('Configure DATABASE_URL em ambiente seguro antes da verificação');
const client=new pg.Client({connectionString:DATABASE_URL,connectionTimeoutMillis:8000,statement_timeout:5000});
const wanted=['001_initial','002_auth_sessions','003_tenant_rls','004_tenant_relationships','005_mfa_recovery','006_mfa_challenge','007_exclusive_owner','008_financial_accounts_funds'];
try {
 await client.connect();
 await client.query('BEGIN READ ONLY');
 const version=await client.query("SELECT current_setting('server_version') AS version, current_database() AS database, current_user AS db_role");
 const schema=await client.query("SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='elo') AS present");
 const tables=await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='elo' ORDER BY table_name");
 let applied=[];
 if(tables.rows.some(row=>row.table_name==='schema_migrations')) {
  const result=await client.query('SELECT version FROM elo.schema_migrations ORDER BY version');
  applied=result.rows.map(row=>row.version);
 }
 const missing=wanted.filter(v=>!applied.includes(v));
 const unknown=applied.filter(v=>!wanted.includes(v));
 await client.query('ROLLBACK');
 // Never display DATABASE_URL, host, password, or data records.
 console.log(JSON.stringify({
  postgresVersion:version.rows[0].version,
  schemaPresent:schema.rows[0].present,
  tableCount:tables.rowCount,
  appliedMigrations:applied,
  missingMigrations:missing,
  unknownMigrations:unknown,
  readyForSchemaReview:missing.length===0&&unknown.length===0
 },null,2));
 if(unknown.length)process.exitCode=2;
}catch(error){
 await client.query('ROLLBACK').catch(()=>{});
 console.error(safeConnectionDiagnostic(error));
 process.exitCode=1;
}finally{await client.end().catch(()=>{});}
