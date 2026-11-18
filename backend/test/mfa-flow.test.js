import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import pg from 'pg';
import argon2 from 'argon2';
import {generateTotpSecret,totpCode,encryptTotpSecret} from '../mfa.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const org='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const admin='bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const role='cccccccc-3333-4333-8333-cccccccccccc';
const password='SenhaInteiramenteFicticia-2026!';
const email='admin-mfa@example.test';
const origin='https://elo360.example.test';
const port=31579;
const base='http://127.0.0.1:'+port;
const json=body=>JSON.stringify(body);
const headers={'Content-Type':'application/json',Origin:origin};

test('MFA-enabled login denies admin access until second factor is verified', {timeout:60000},async()=>{
 assert.equal(process.env.CI_ELO_DB,'ephemeral');
 const u=new URL(process.env.DATABASE_URL||'');
 assert.equal(u.hostname,'127.0.0.1');
 assert.equal(u.pathname,'/elo360_ci');
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});
 const key=randomBytes(32).toString('hex');
 const secret=generateTotpSecret();
 let child;
 try{
  await db.connect();
  for(const file of ['001_initial.sql','002_auth_sessions.sql','006_mfa_challenge.sql','007_exclusive_owner.sql'])
   await db.query(fs.readFileSync(path.join(root,'db',file),'utf8'));
  await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2)',[org,'Fictícia MFA']);
  await db.query('INSERT INTO elo.users(id,organization_id,email,display_name,password_hash,status) VALUES($1,$2,$3,$4,$5,$6)',[admin,org,email,'Admin MFA Fictício',await argon2.hash(password),'active']);
  await db.query('INSERT INTO elo.roles(id,code,description) VALUES($1,$2,$3)',[role,'admin','Administração fictícia']);
  await db.query('INSERT INTO elo.user_roles(user_id,role_id) VALUES($1,$2)',[admin,role]);
  await db.query('INSERT INTO elo.user_mfa(user_id,secret_encrypted,enabled) VALUES($1,$2,true)',
   [admin,encryptTotpSecret(secret,key,admin)]);
  child=spawn(process.execPath,['server.js'],{
   cwd:path.join(root,'backend'),
   env:{...process.env,PORT:String(port),APP_ORIGIN:origin,NODE_ENV:'test',MFA_ENCRYPTION_KEY:key},
   stdio:'ignore'
  });
  let started=false;
  for(let i=0;i<80;i++){
   try{if((await fetch(base+'/health')).ok){started=true;break;}}catch{}
   if(child.exitCode!==null)break;
   await sleep(200);
  }
  assert.ok(started,'MFA CI server must start');
  const attempt=async()=>fetch(base+'/api/auth/login',{method:'POST',headers,body:json({organizationId:org,email,password})});

  let r=await attempt();
  assert.equal(r.status,202,'Password alone must not issue full login session');
  assert.deepEqual(await r.json(),{mfaRequired:true});
  assert.equal(r.headers.get('set-cookie')?.includes('elo360pending='),true);
  const pending=r.headers.get('set-cookie').match(/elo360pending=[0-9a-f]{64}/)?.[0];
  assert.ok(pending);
  const sessionBefore=await db.query('SELECT count(*)::int AS total FROM elo.auth_sessions WHERE user_id=$1',[admin]);
  assert.equal(sessionBefore.rows[0].total,0,'No session created after password-only step');
  r=await fetch(base+'/api/admin/check',{headers:{Cookie:pending}});
  assert.equal(r.status,401,'Pending challenge cannot access administration');
  r=await fetch(base+'/admin',{headers:{Cookie:pending}});
  assert.equal(r.status,401,'Pending challenge cannot open admin HTML');
  r=await fetch(base+'/api/auth/mfa/verify',{method:'POST',headers,body:json({code:totpCode(secret)})});
  assert.equal(r.status,401,'MFA code without pending challenge denied');

  r=await fetch(base+'/api/auth/mfa/verify',{method:'POST',headers:{...headers,Cookie:pending},body:json({code:'invalid'})});
  assert.equal(r.status,400,'Invalid code format rejected');
  r=await fetch(base+'/api/auth/mfa/verify',{method:'POST',headers:{...headers,Cookie:pending},body:json({code:'000000'})});
  if(totpCode(secret)!=='000000')assert.equal(r.status,401,'Incorrect MFA code rejected');
  r=await fetch(base+'/api/auth/mfa/verify',{method:'POST',headers:{...headers,Cookie:pending},body:json({code:totpCode(secret)})});
  assert.equal(r.status,200,'MFA code completes login');
  const fullCookie=r.headers.get('set-cookie')?.match(/elo360sid=[0-9a-f]{64}/)?.[0];
  assert.ok(fullCookie,'Session cookie only after second factor');
  r=await fetch(base+'/api/admin/check',{headers:{Cookie:fullCookie}});
  assert.equal(r.status,200,'Admin accessible only with full session');
  r=await fetch(base+'/api/auth/mfa/verify',{method:'POST',headers:{...headers,Cookie:pending},body:json({code:totpCode(secret)})});
  assert.equal(r.status,401,'Challenge can never be replayed');
  const total=await db.query('SELECT count(*)::int AS n FROM elo.auth_sessions WHERE user_id=$1',[admin]);
  assert.equal(total.rows[0].n,1);

  // New password challenge with an already accepted TOTP counter must fail.
  r=await attempt();
  assert.equal(r.status,202);
  const secondPending=r.headers.get('set-cookie')?.match(/elo360pending=[0-9a-f]{64}/)?.[0];
  assert.ok(secondPending);
  r=await fetch(base+'/api/auth/mfa/verify',{method:'POST',headers:{...headers,Cookie:secondPending},body:json({code:totpCode(secret)})});
  assert.equal(r.status,401,'Used TOTP cannot be reused in another challenge');
  const noNewSession=await db.query('SELECT count(*)::int AS n FROM elo.auth_sessions WHERE user_id=$1',[admin]);
  assert.equal(noNewSession.rows[0].n,1);
 }finally{
  if(child){child.kill('SIGTERM');await sleep(100);if(child.exitCode===null)child.kill('SIGKILL');}
  await db.end().catch(()=>{});
 }
});
