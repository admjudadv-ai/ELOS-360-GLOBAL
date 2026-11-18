import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import argon2 from 'argon2';
import {generateTotpSecret,totpCode,decryptTotpSecret} from '../mfa.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const script=path.join(root,'backend/scripts/bootstrap-admin-mfa.js');
const fakeEmail='first-admin@example.test';
const fakePassword='Ficticia!PrimeiraAdmin#2026';
const files=['001_initial.sql','002_auth_sessions.sql','003_tenant_rls.sql','004_tenant_relationships.sql','005_mfa_recovery.sql','006_mfa_challenge.sql','007_exclusive_owner.sql','008_financial_accounts_funds.sql'];

test('first admin requires verified MFA and is only provisioned once in disposable CI', {timeout:60000},async()=>{
 assert.equal(process.env.CI_ELO_DB,'ephemeral');
 const url=new URL(process.env.DATABASE_URL||'');
 assert.equal(url.hostname,'127.0.0.1');
 assert.equal(url.pathname,'/elo360_ci');
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 const key=randomBytes(32).toString('hex');
 const secret=generateTotpSecret();
 const env={...process.env,CI_ELO_DB:'ephemeral',
  ELO_DB_EXPECTED_NAME:'elo360_ci',ELO_ADMIN_EMAIL:fakeEmail,
  ELO_ADMIN_PASSWORD:fakePassword,MFA_ENCRYPTION_KEY:key,
  ELO_BOOTSTRAP_APPROVAL:'CRIAR_PRIMEIRA_ADMIN_ELO360_MFA',ELO_CI_MFA_SECRET:secret};
 const run=(overrides={})=>spawnSync(process.execPath,[script],{
  cwd:path.join(root,'backend'),env:{...env,...overrides},encoding:'utf8',timeout:25000
 });
 try{
  await db.connect();
  for(const name of files)await db.query(fs.readFileSync(path.join(root,'db',name),'utf8'));
  let r=run({ELO_BOOTSTRAP_APPROVAL:''});
  assert.notEqual(r.status,0);
  const wrongCode=totpCode(secret)==='000000'?'111111':'000000';
  r=run({ELO_CI_MFA_CODE:wrongCode});
  assert.notEqual(r.status,0,'MFA challenge must be confirmed');
  const before=await db.query('SELECT count(*)::int AS n FROM elo.users');
  assert.equal(before.rows[0].n,0,'Failure must roll back all user records');
  r=run({ELO_CI_MFA_CODE:totpCode(secret)});
  assert.equal(r.status,0,'Valid enrollment should succeed: '+r.stderr.slice(0,400));
  assert.ok(!r.stdout.includes(fakePassword));
  assert.ok(!r.stdout.includes(secret));
  const users=await db.query(
   'SELECT u.id,u.organization_id,u.password_hash,f.enabled,f.last_accepted_counter,f.secret_encrypted FROM elo.users u JOIN elo.user_mfa f ON f.user_id=u.id'
  );
  assert.equal(users.rowCount,1);
  assert.equal(users.rows[0].enabled,true);
  assert.ok(await argon2.verify(users.rows[0].password_hash,fakePassword));
  assert.equal(decryptTotpSecret(users.rows[0].secret_encrypted,key,users.rows[0].id),secret);
  assert.ok(users.rows[0].last_accepted_counter>=0);
  await assert.rejects(
    db.query('INSERT INTO elo.platform_ownership(singleton,user_id) VALUES(TRUE,$1)',[users.rows[0].id]),
    error=>error?.code==='23505',
    'Platform cannot have a second owner record'
  );
  const roles=await db.query('SELECT r.code FROM elo.user_roles ur JOIN elo.roles r ON r.id=ur.role_id WHERE ur.user_id=$1',[users.rows[0].id]);
  assert.deepEqual(roles.rows.map(row=>row.code),['admin']);
  const exclusive=await db.query('SELECT user_id FROM elo.platform_ownership');
  assert.equal(exclusive.rowCount,1);
  assert.equal(exclusive.rows[0].user_id,users.rows[0].id);
  const codes=await db.query('SELECT code_hash FROM elo.mfa_recovery_codes WHERE user_id=$1',[users.rows[0].id]);
  assert.equal(codes.rowCount,8);
  assert.ok(codes.rows.every(row=>/^[a-f0-9]{64}$/.test(row.code_hash)));
  const attemptedAgain=run({ELO_CI_MFA_CODE:totpCode(secret)});
  assert.notEqual(attemptedAgain.status,0,'Bootstrap may not create a second admin');
  const count=await db.query('SELECT count(*)::int AS n FROM elo.users');
  assert.equal(count.rows[0].n,1);
 }finally{await db.end().catch(()=>{});}
});
