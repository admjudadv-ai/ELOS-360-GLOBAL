import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import pg from 'pg';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const filenames=['001_initial.sql','002_auth_sessions.sql','003_tenant_rls.sql','004_tenant_relationships.sql','005_mfa_recovery.sql','006_mfa_challenge.sql','007_exclusive_owner.sql','008_financial_accounts_funds.sql'];
const expected=filenames.map(name=>name.replace(/\.sql$/,''));

test('read-only database readiness reports missing and complete migrations without changing schema', {timeout:60000},async()=>{
 assert.equal(process.env.CI_ELO_DB,'ephemeral','Only ephemeral CI DB allowed for this test');
 const u=new URL(process.env.DATABASE_URL||'');
 assert.equal(u.hostname,'127.0.0.1');
 assert.equal(u.pathname,'/elo360_ci');
 const client=new pg.Client({connectionString:process.env.DATABASE_URL});
 const check=()=>JSON.parse(execFileSync(process.execPath,[path.join(root,'backend/scripts/check-db-readiness.js')],{
  cwd:path.join(root,'backend'),encoding:'utf8',env:{...process.env,CI_ELO_DB:'ephemeral'},timeout:12000
 }));
 try{
  await client.connect();
  const empty=check();
  assert.equal(empty.schemaPresent,false);
  assert.equal(empty.tableCount,0);
  assert.deepEqual(empty.missingMigrations,expected);
  assert.equal(empty.readyForSchemaReview,false);
  for(const name of filenames)await client.query(fs.readFileSync(path.join(root,'db',name),'utf8'));
  const complete=check();
  assert.equal(complete.schemaPresent,true);
  assert.deepEqual(complete.missingMigrations,[]);
  assert.deepEqual(complete.appliedMigrations,expected);
  assert.equal(complete.unknownMigrations.length,0);
  assert.equal(complete.readyForSchemaReview,true);
  const after=await client.query('SELECT count(*)::int AS total FROM elo.schema_migrations');
  assert.equal(after.rows[0].total,8,'Readiness check must not modify migration tracking');
 }finally{await client.end().catch(()=>{});}
});
