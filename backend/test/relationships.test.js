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
const caseA='aaaaaaaa-3333-4333-8333-333333333333';
const caseB='bbbbbbbb-4444-4444-8444-444444444444';
const projectA='aaaaaaaa-5555-4555-8555-555555555555';
const projectB='bbbbbbbb-6666-4666-8666-666666666666';
const userA='aaaaaaaa-7777-4777-8777-777777777777';
const userB='bbbbbbbb-8888-4888-8888-888888888888';

test('composite foreign keys reject cross-organization references in PostgreSQL CI', {timeout:60000},async()=>{
 assert.equal(process.env.CI_ELO_DB,'ephemeral','Integration tests only on disposable database');
 const parsed=new URL(process.env.DATABASE_URL||'');
 assert.equal(parsed.hostname,'127.0.0.1');
 assert.equal(parsed.pathname,'/elo360_ci');
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 try{
  await db.connect();
  for(const filename of ['001_initial.sql','002_auth_sessions.sql','003_tenant_rls.sql','004_tenant_relationships.sql'])
   await db.query(fs.readFileSync(path.join(root,'db',filename),'utf8'));
  const versions=await db.query('SELECT version FROM elo.schema_migrations ORDER BY version');
  assert.deepEqual(versions.rows.map(row=>row.version),
   ['001_initial','002_auth_sessions','003_tenant_rls','004_tenant_relationships']);
  await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2),($3,$4)',
   [orgA,'Organização Fictícia A',orgB,'Organização Fictícia B']);
  await db.query('INSERT INTO elo.clients(id,organization_id,display_name) VALUES($1,$2,$3),($4,$5,$6)',
   [clientA,orgA,'Cliente A',clientB,orgB,'Cliente B']);
  await db.query("INSERT INTO elo.cases(id,organization_id,client_id,area,title) VALUES ($1,$2,$3,'juridico','Caso A'),($4,$5,$6,'juridico','Caso B')",
   [caseA,orgA,clientA,caseB,orgB,clientB]);
  await db.query("INSERT INTO elo.projects(id,organization_id,sector,title) VALUES($1,$2,'saude','Projeto A'),($3,$4,'saude','Projeto B')",
   [projectA,orgA,projectB,orgB]);
  await db.query("INSERT INTO elo.users(id,organization_id,email,display_name) VALUES($1,$2,'a@example.test','A'),($3,$4,'b@example.test','B')",
   [userA,orgA,userB,orgB]);

  // Valid references from the same organization must continue to work.
  await db.query("INSERT INTO elo.employment_periods(organization_id,case_id,employer_label,start_date) VALUES($1,$2,'Empresa Exemplo','2025-01-01')",[orgA,caseA]);
  await db.query("INSERT INTO elo.reports(organization_id,case_id,report_type) VALUES($1,$2,'ficticio')",[orgA,caseA]);
  await db.query("INSERT INTO elo.documents(organization_id,case_id,object_key,original_filename) VALUES($1,$2,'fake/one','fake.pdf')",[orgA,caseA]);
  await db.query("INSERT INTO elo.financial_entries(organization_id,project_id,amount,currency,entry_type) VALUES($1,$2,10,'BRL','income')",[orgA,projectA]);
  await db.query("INSERT INTO elo.assistant_sessions(organization_id,client_id) VALUES($1,$2)",[orgA,clientA]);
  await db.query("INSERT INTO elo.audit_events(organization_id,actor_id,action,target_type) VALUES($1,$2,'test','fake')",[orgA,userA]);

  const crossOrgAttempts=[
   ["cases", "INSERT INTO elo.cases(organization_id,client_id,area,title) VALUES($1,$2,'juridico','Inválido')",[orgA,clientB]],
   ["employment_periods","INSERT INTO elo.employment_periods(organization_id,case_id,employer_label,start_date) VALUES($1,$2,'Exemplo','2025-01-01')",[orgA,caseB]],
   ["reports","INSERT INTO elo.reports(organization_id,case_id,report_type) VALUES($1,$2,'ficticio')",[orgA,caseB]],
   ["documents","INSERT INTO elo.documents(organization_id,case_id,object_key,original_filename) VALUES($1,$2,'fake/cross','cross.pdf')",[orgA,caseB]],
   ["financial_entries","INSERT INTO elo.financial_entries(organization_id,project_id,amount,currency,entry_type) VALUES($1,$2,10,'BRL','income')",[orgA,projectB]],
   ["assistant_sessions","INSERT INTO elo.assistant_sessions(organization_id,client_id) VALUES($1,$2)",[orgA,clientB]],
   ["audit_events","INSERT INTO elo.audit_events(organization_id,actor_id,action,target_type) VALUES($1,$2,'test','fake')",[orgA,userB]]
  ];
  for(const [table,sql,params] of crossOrgAttempts){
   await assert.rejects(db.query(sql,params),err=>err?.code==='23503',
    table+': cross-organization relationship must violate foreign key');
  }
  const clients=await db.query('SELECT count(*)::int AS total FROM elo.clients');
  assert.equal(clients.rows[0].total,2,'Original fictitious rows preserved');
 }finally{await db.end().catch(()=>{});}
});
