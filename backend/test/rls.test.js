import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const orgA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const orgB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const clientA='aaaaaaaa-1111-4111-8111-111111111111';
const clientB='bbbbbbbb-2222-4222-8222-222222222222';
function requireEphemeralDatabase(){
 assert.equal(process.env.CI_ELO_DB,'ephemeral','RLS tests must run only in disposable CI');
 const parsed=new URL(process.env.DATABASE_URL||'');
 assert.equal(parsed.hostname,'127.0.0.1','Local database required');
 assert.equal(parsed.pathname,'/elo360_ci','Disposable CI database required');
}
async function inRole(db,org,callback){
 await db.query('BEGIN');
 try {
  await db.query('SET LOCAL ROLE elo_ci_rls_app');
  if(org)await db.query("SELECT set_config('elo.organization_id',$1,true)",[org]);
  const output=await callback();
  await db.query('COMMIT');
  return output;
 }catch(err){await db.query('ROLLBACK').catch(()=>{});throw err;}
}

test('tenant RLS denies absent context and cross-organization access in real PostgreSQL', {timeout:60000},async()=>{
 requireEphemeralDatabase();
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 try{
  await db.connect();
  for(const filename of ['001_initial.sql','002_auth_sessions.sql','003_tenant_rls.sql'])
   await db.query(fs.readFileSync(path.join(root,'db',filename),'utf8'));
  await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2),($3,$4)',[orgA,'Tenant Fictício A',orgB,'Tenant Fictício B']);
  await db.query('INSERT INTO elo.clients(id,organization_id,display_name) VALUES($1,$2,$3),($4,$5,$6)',
   [clientA,orgA,'Cliente Fictício A',clientB,orgB,'Cliente Fictício B']);
  await db.query("CREATE ROLE elo_ci_rls_app NOLOGIN NOSUPERUSER NOBYPASSRLS");
  await db.query("GRANT USAGE ON SCHEMA elo TO elo_ci_rls_app");
  await db.query("GRANT SELECT,INSERT,UPDATE,DELETE ON elo.clients,elo.projects TO elo_ci_rls_app");
  const missing=await inRole(db,null,async()=>{
   const rows=await db.query('SELECT id FROM elo.clients');
   assert.equal(rows.rowCount,0,'Without trusted organization context, deny all reads');
   await assert.rejects(db.query('INSERT INTO elo.clients(organization_id,display_name) VALUES($1,$2)',[orgA,'Tentativa sem contexto']),/row-level security policy/i);
  });
  const scoped=await inRole(db,orgA,async()=>{
   const rows=await db.query('SELECT id,organization_id FROM elo.clients ORDER BY id');
   assert.deepEqual(rows.rows.map(r=>r.id),[clientA],'Only tenant A rows may be visible');
   const attempted=await db.query('UPDATE elo.clients SET display_name=$1 WHERE id=$2',['Alteração Negada',clientB]);
   assert.equal(attempted.rowCount,0,'Tenant A cannot update tenant B');
   const removed=await db.query('DELETE FROM elo.clients WHERE id=$1',[clientB]);
   assert.equal(removed.rowCount,0,'Tenant A cannot delete tenant B');
   await assert.rejects(db.query('INSERT INTO elo.projects(organization_id,sector,title) VALUES($1,$2,$3)',
    [orgB,'Saúde','Projeto indevido']),/row-level security policy/i);
  });
  await inRole(db,orgB,async()=>{
   const rows=await db.query('SELECT id FROM elo.clients');
   assert.deepEqual(rows.rows.map(r=>r.id),[clientB],'Tenant B sees only tenant B');
  });
  const intact=await db.query('SELECT display_name FROM elo.clients WHERE id=$1',[clientB]);
  assert.equal(intact.rows[0].display_name,'Cliente Fictício B');
 }finally{await db.end().catch(()=>{});}
});
