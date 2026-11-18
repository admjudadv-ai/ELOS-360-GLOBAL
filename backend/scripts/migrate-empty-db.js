// Migração INICIAL apenas para banco completamente vazio.
// Nunca execute automaticamente em build/deploy. Não use para atualizar bancos com dados.
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const requiredAck='EU_AUTORIZO_MIGRACAO_INICIAL_ELO360_BANCO_VAZIO';
const {DATABASE_URL,ELO_DB_MIGRATION_ACK,ELO_DB_EXPECTED_NAME}=process.env;
if(ELO_DB_MIGRATION_ACK!==requiredAck)throw Error('Migração bloqueada: autorização explícita ausente');
if(!DATABASE_URL)throw Error('DATABASE_URL deve ser configurado apenas no terminal seguro');
if(!ELO_DB_EXPECTED_NAME||!/^[A-Za-z0-9_]{1,63}$/.test(ELO_DB_EXPECTED_NAME))
 throw Error('Nome do banco esperado não informado');
const u=new URL(DATABASE_URL);
if(u.protocol!=='postgresql:'&&u.protocol!=='postgres:')throw Error('Protocolo PostgreSQL obrigatório');
if(!u.hostname)throw Error('Host de PostgreSQL não informado');
const files=['001_initial.sql','002_auth_sessions.sql','003_tenant_rls.sql','004_tenant_relationships.sql','005_mfa_recovery.sql','006_mfa_challenge.sql','007_exclusive_owner.sql','008_financial_accounts_funds.sql'];
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../db');
const client=new pg.Client({connectionString:DATABASE_URL,connectionTimeoutMillis:10000,statement_timeout:30000});
let locked=false;
let inTransaction=false;
try{
 await client.connect();
 const info=await client.query('SELECT current_database() AS database, pg_is_in_recovery() AS standby');
 if(info.rows[0].database!==ELO_DB_EXPECTED_NAME||info.rows[0].standby)
  throw Error('Banco não corresponde ao nome esperado ou está em modo somente leitura');
 // An explicit advisory lock avoids concurrent first-time migration runners.
 const lock=await client.query("SELECT pg_try_advisory_lock(hashtext('elo360:first-schema')) AS acquired");
 if(!lock.rows[0].acquired)throw Error('Outra migração está ativa');
 locked=true;
 const existing=await client.query("SELECT table_schema,table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') AND table_schema NOT LIKE 'pg_toast%'");
 if(existing.rowCount!==0)throw Error('Migração inicial proibida: o banco já possui tabelas');
 await client.query('BEGIN');
 inTransaction=true;
 for(const filename of files){
  const sql=await fs.readFile(path.join(directory,filename),'utf8');
  // Standalone SQL files own their transactions. The installer uses one for the full batch.
  const migration=sql.match(/^(?:[ \t]*--[^\r\n]*\r?\n|[ \t]*\r?\n)*BEGIN;\r?\n([\s\S]+)\r?\nCOMMIT;\s*$/);
  if(!migration)throw Error('Formato de transação inesperado: '+filename);
  await client.query(migration[1]);
 }
 const result=await client.query('SELECT version FROM elo.schema_migrations ORDER BY version');
 const expected=files.map(filename=>path.basename(filename,'.sql'));
 if(result.rows.length!==expected.length||result.rows.some((row,index)=>row.version!==expected[index]))
  throw Error('Inventário final inesperado: interrompa e investigue');
 await client.query('COMMIT');
 inTransaction=false;
 for(const filename of files)console.log('Migração estrutural aplicada:',filename);
 console.log('Estrutura inicial criada. Não liberar clientes: autorização, backup e auditoria permanecem pendentes.');
}catch(error){
 if(inTransaction)await client.query('ROLLBACK').catch(()=>{});
 console.error('Migração inicial interrompida:',error?.code||error?.message?.slice(0,160)||'unknown');
 process.exitCode=1;
}finally{
 if(locked)await client.query("SELECT pg_advisory_unlock(hashtext('elo360:first-schema'))").catch(()=>{});
 await client.end().catch(()=>{});
}
