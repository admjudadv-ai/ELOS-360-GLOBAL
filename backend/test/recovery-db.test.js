import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {generateRecoveryCodes,recoveryCodeDigest} from '../recovery.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const orgA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const orgB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userA='aaaaaaaa-1111-4111-8111-111111111111';
const userB='bbbbbbbb-2222-4222-8222-222222222222';
async function inRole(db,organization,fn){
 await db.query('BEGIN');
 try {
  await db.query('SET LOCAL ROLE elo_ci_recovery_app');
  if(organization)await db.query("SELECT set_config('elo.organization_id',$1,true)",[organization]);
  const result=await fn();
  await db.query('COMMIT');
  return result;
 }catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}
}
test('recovery code hash is one-time and cannot be used by another tenant', {timeout:60000},async()=>{
 assert.equal(process.env.CI_ELO_DB,'ephemeral','Only disposable CI database');
 const database=new URL(process.env.DATABASE_URL||'');
 assert.equal(database.hostname,'127.0.0.1');
 assert.equal(database.pathname,'/elo360_ci');
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 try{
  await db.connect();
  for(const filename of ['001_initial.sql','002_auth_sessions.sql','003_tenant_rls.sql','004_tenant_relationships.sql','005_mfa_recovery.sql']){
   await db.query(fs.readFileSync(path.join(root,'db',filename),'utf8'));
  }
  await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2),($3,$4)',[orgA,'Fictícia A',orgB,'Fictícia B']);
  await db.query("INSERT INTO elo.users(id,organization_id,email,display_name) VALUES($1,$2,'alice@example.test','Fictícia A'),($3,$4,'bob@example.test','Fictícia B')",[userA,orgA,userB,orgB]);
  const code=generateRecoveryCodes(1)[0],hash=recoveryCodeDigest(userA,code);
  await db.query('INSERT INTO elo.mfa_recovery_codes(organization_id,user_id,code_hash) VALUES($1,$2,$3)',[orgA,userA,hash]);
  await db.query('CREATE ROLE elo_ci_recovery_app NOLOGIN NOSUPERUSER NOBYPASSRLS');
  await db.query('GRANT USAGE ON SCHEMA elo TO elo_ci_recovery_app');
  await db.query('GRANT SELECT,DELETE ON elo.mfa_recovery_codes TO elo_ci_recovery_app');

  const sql='DELETE FROM elo.mfa_recovery_codes WHERE user_id=$1 AND code_hash=$2 RETURNING id';
  const noContext=await inRole(db,null,async()=>(await db.query(sql,[userA,hash])).rowCount);
  assert.equal(noContext,0,'No organization context denies redemption');
  const otherTenant=await inRole(db,orgB,async()=>(await db.query(sql,[userA,hash])).rowCount);
  assert.equal(otherTenant,0,'Cross-tenant redemption denied');
  const wrongUser=await inRole(db,orgA,async()=>(await db.query(sql,[userB,hash])).rowCount);
  assert.equal(wrongUser,0,'Recovery code bound to intended user');
  const redeemed=await inRole(db,orgA,async()=>(await db.query(sql,[userA,hash])).rowCount);
  assert.equal(redeemed,1,'Code consumed atomically');
  const replay=await inRole(db,orgA,async()=>(await db.query(sql,[userA,hash])).rowCount);
  assert.equal(replay,0,'Code cannot be used twice');
  const stored=await db.query('SELECT count(*)::int AS total FROM elo.mfa_recovery_codes');
  assert.equal(stored.rows[0].total,0,'Consumed hash removed');
  assert.equal(hash.includes(code),false,'Plaintext never part of digest');
 }finally{await db.end().catch(()=>{});}
});
