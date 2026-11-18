import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import pg from 'pg';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const script=path.join(root,'backend/scripts/migrate-empty-db.js');
test('first schema migration requires approval and refuses already initialized database', {timeout:60000},async()=>{
 assert.equal(process.env.CI_ELO_DB,'ephemeral');
 const u=new URL(process.env.DATABASE_URL||'');
 assert.equal(u.hostname,'127.0.0.1');
 assert.equal(u.pathname,'/elo360_ci');
 const env={...process.env,ELO_DB_EXPECTED_NAME:'elo360_ci'};
 const run=(vars)=>spawnSync(process.execPath,[script],{cwd:path.join(root,'backend'),encoding:'utf8',timeout:45000,env:{...env,...vars}});
 const noConsent=run({ELO_DB_MIGRATION_ACK:''});
 assert.notEqual(noConsent.status,0,'No implicit migration without authorization');
 const wrongDb=run({ELO_DB_EXPECTED_NAME:'other_db',ELO_DB_MIGRATION_ACK:'EU_AUTORIZO_MIGRACAO_INICIAL_ELO360_BANCO_VAZIO'});
 assert.notEqual(wrongDb.status,0,'Reject unexpected target database');
 const approved=run({ELO_DB_MIGRATION_ACK:'EU_AUTORIZO_MIGRACAO_INICIAL_ELO360_BANCO_VAZIO'});
 assert.equal(approved.status,0,'First migration must complete: '+approved.stderr.slice(0,500));
 const client=new pg.Client({connectionString:process.env.DATABASE_URL});
 try{
  await client.connect();
  const result=await client.query('SELECT version FROM elo.schema_migrations ORDER BY version');
  assert.deepEqual(result.rows.map(x=>x.version),[
   '001_initial','002_auth_sessions','003_tenant_rls','004_tenant_relationships','005_mfa_recovery','006_mfa_challenge','007_exclusive_owner','008_financial_accounts_funds'
  ]);
 }finally{await client.end().catch(()=>{});}
 const rerun=run({ELO_DB_MIGRATION_ACK:'EU_AUTORIZO_MIGRACAO_INICIAL_ELO360_BANCO_VAZIO'});
 assert.notEqual(rerun.status,0,'Refuse changing already initialized schema');
 assert.match(rerun.stderr,/banco já possui tabelas/i);
});
