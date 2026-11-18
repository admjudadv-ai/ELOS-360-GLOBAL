import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const orgA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const orgB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const acctA='aaaaaaaa-1111-4111-8111-111111111111';
const acctB='bbbbbbbb-1111-4111-8111-111111111111';
const fundA='aaaaaaaa-2222-4222-8222-222222222222';
const fundB='bbbbbbbb-2222-4222-8222-222222222222';

async function asOrg(db,org,callback){
 await db.query('BEGIN');
 try {
  await db.query('SET LOCAL ROLE elo_ci_finance_app');
  if(org)await db.query("SELECT set_config('elo.organization_id',$1,true)",[org]);
  const result=await callback();
  await db.query('COMMIT');
  return result;
 } catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}
}
test('financial account and fund tables isolate tenants, restrict sensitive identifiers and prevent cross-tenant links', {timeout:60000},async()=>{
 assert.equal(process.env.CI_ELO_DB,'ephemeral');
 const conn=new URL(process.env.DATABASE_URL||'');
 assert.equal(conn.hostname,'127.0.0.1');
 assert.equal(conn.pathname,'/elo360_ci');
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 try{
  await db.connect();
  for(const filename of ['001_initial.sql','002_auth_sessions.sql','003_tenant_rls.sql','004_tenant_relationships.sql',
   '005_mfa_recovery.sql','006_mfa_challenge.sql','007_exclusive_owner.sql','008_financial_accounts_funds.sql']){
   await db.query(fs.readFileSync(path.join(root,'db',filename),'utf8'));
  }
  const applied=await db.query('SELECT version FROM elo.schema_migrations ORDER BY version');
  assert.equal(applied.rowCount,8);
  await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2),($3,$4)',
   [orgA,'Organização Fictícia A',orgB,'Organização Fictícia B']);
  await db.query(`INSERT INTO elo.financial_accounts(id,organization_id,display_name,bank_name,country_code,currency,account_kind,identifier_last4,status)
   VALUES ($1,$2,'Conta Recebedora A','Banco Exemplo','BR','BRL','payment','1234','draft'),
          ($3,$4,'Conta Recebedora B','Banco Exemplo','BR','BRL','checking','5678','draft')`,
   [acctA,orgA,acctB,orgB]);
  await db.query(`INSERT INTO elo.financial_funds(id,organization_id,name,purpose,currency,receiving_account_id)
   VALUES ($1,$2,'Fundo Projetos A','project','BRL',$3),($4,$5,'Fundo Projetos B','project','BRL',$6)`,
   [fundA,orgA,acctA,fundB,orgB,acctB]);
  // The bank identifier must not be saved in plaintext even by a privileged writer.
  await assert.rejects(db.query(`INSERT INTO elo.financial_accounts(organization_id,display_name,bank_name,country_code,currency,account_kind,encrypted_account_identifier)
    VALUES($1,'Conta Fake','Banco Exemplo','BR','BRL','checking','123456789')`,[orgA]),e=>e?.code==='23514');
  for(const [table,sql,params] of [
   ['funds',`INSERT INTO elo.financial_funds(organization_id,name,purpose,currency,receiving_account_id)
     VALUES($1,'Inválido','reserve','BRL',$2)`,[orgA,acctB]],
   ['movements',`INSERT INTO elo.financial_fund_movements(organization_id,fund_id,movement_kind,amount,currency,reference_label)
     VALUES($1,$2,'contribution',100,'BRL','Teste')`,[orgA,fundB]],
   ['investments',`INSERT INTO elo.financial_investments(organization_id,fund_id,label,investment_kind,currency)
     VALUES($1,$2,'Ativo Exemplo','fund','BRL')`,[orgA,fundB]]
  ]){
   await assert.rejects(db.query(sql,params),err=>err?.code==='23503',table+' rejects cross-tenant linking');
  }
  await db.query("CREATE ROLE elo_ci_finance_app NOLOGIN NOSUPERUSER NOBYPASSRLS");
  await db.query("GRANT USAGE ON SCHEMA elo TO elo_ci_finance_app");
  await db.query("GRANT SELECT,INSERT,UPDATE,DELETE ON elo.financial_accounts,elo.financial_funds,elo.financial_fund_movements,elo.financial_investments TO elo_ci_finance_app");
  const absent=await asOrg(db,null,async()=>{
   const x=await db.query('SELECT id FROM elo.financial_accounts');
   return x.rowCount;
  });
  assert.equal(absent,0);
  await asOrg(db,orgA,async()=>{
   const a=await db.query('SELECT id,identifier_last4 FROM elo.financial_accounts');
   assert.deepEqual(a.rows,[{id:acctA,identifier_last4:'1234'}]);
   const funds=await db.query('SELECT id FROM elo.financial_funds');
   assert.deepEqual(funds.rows.map(x=>x.id),[fundA]);
   const change=await db.query("UPDATE elo.financial_accounts SET status='disabled' WHERE id=$1",[acctB]);
   assert.equal(change.rowCount,0);
   const move=await db.query(`INSERT INTO elo.financial_fund_movements(organization_id,fund_id,movement_kind,amount,currency,reference_label)
    VALUES($1,$2,'contribution',150,'BRL','Aporte fictício') RETURNING id`,[orgA,fundA]);
   assert.equal(move.rowCount,1);
  });
  await asOrg(db,orgB,async()=>{
   const a=await db.query('SELECT id FROM elo.financial_accounts');
   assert.deepEqual(a.rows.map(x=>x.id),[acctB]);
   const movement=await db.query('SELECT id FROM elo.financial_fund_movements');
   assert.equal(movement.rowCount,0);
  });
 }finally{await db.end().catch(()=>{});}
});
