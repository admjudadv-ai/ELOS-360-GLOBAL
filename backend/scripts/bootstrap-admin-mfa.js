// ELO 360 GLOBAL — primeira conta administrativa com MFA confirmado.
// Execute SOMENTE em terminal pessoal confiável; nunca como etapa de build/deploy.
// Nenhuma senha, segredo MFA ou código de recuperação deve entrar em logs.
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import pg from 'pg';
import argon2 from 'argon2';
import {generateTotpSecret,encryptTotpSecret,matchTotp} from '../mfa.js';
import {generateRecoveryCodes,recoveryCodeDigest} from '../recovery.js';

const {DATABASE_URL,ELO_DB_EXPECTED_NAME,ELO_BOOTSTRAP_APPROVAL,
 ELO_ADMIN_EMAIL,ELO_ADMIN_PASSWORD,MFA_ENCRYPTION_KEY,CI_ELO_DB}=process.env;
if(ELO_BOOTSTRAP_APPROVAL!=='CRIAR_PRIMEIRA_ADMIN_ELO360_MFA')throw Error('Autorização explícita ausente');
if(!DATABASE_URL||!ELO_DB_EXPECTED_NAME||!ELO_ADMIN_EMAIL||!ELO_ADMIN_PASSWORD||!MFA_ENCRYPTION_KEY)
 throw Error('Configuração segura incompleta');
const u=new URL(DATABASE_URL);
if(!['postgres:','postgresql:'].includes(u.protocol)||u.pathname!=='/'+ELO_DB_EXPECTED_NAME)throw Error('Banco diferente do esperado');
const ci=CI_ELO_DB==='ephemeral'&&u.hostname==='127.0.0.1'&&ELO_DB_EXPECTED_NAME==='elo360_ci';
if(CI_ELO_DB==='ephemeral'&&!ci)throw Error('Modo CI exige banco local descartável');
if(!ci&&!stdin.isTTY)throw Error('Homologação real requer terminal interativo');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ELO_ADMIN_EMAIL)||ELO_ADMIN_EMAIL.length>254)throw Error('E-mail inválido');
if(ELO_ADMIN_PASSWORD.length<16||ELO_ADMIN_PASSWORD.length>256)throw Error('A senha deve ter entre 16 e 256 caracteres');
if(!/^[0-9a-f]{64}$/i.test(MFA_ENCRYPTION_KEY))throw Error('Chave MFA inválida');
const db=new pg.Client({connectionString:DATABASE_URL,connectionTimeoutMillis:10000,statement_timeout:15000});
let rl;
try{
 await db.connect();
 await db.query('BEGIN');
 const expected=['001_initial','002_auth_sessions','003_tenant_rls','004_tenant_relationships','005_mfa_recovery','006_mfa_challenge','007_exclusive_owner','008_financial_accounts_funds'];
 const migrations=await db.query('SELECT version FROM elo.schema_migrations ORDER BY version');
 if(JSON.stringify(migrations.rows.map(x=>x.version))!==JSON.stringify(expected))throw Error('Migrações não estão completas');
 const admins=await db.query("SELECT count(*)::int AS count FROM elo.user_roles ur JOIN elo.roles r ON r.id=ur.role_id WHERE r.code='admin'");
 if(admins.rows[0].count!==0)throw Error('Já existe administrador: bootstrap bloqueado');
 const existing=await db.query('SELECT count(*)::int AS count FROM elo.users');
 if(existing.rows[0].count!==0)throw Error('Banco já possui usuários: provisionamento inicial bloqueado');
 const orgId=randomUUID(),userId=randomUUID();
 // Recovery-code inserts are protected by tenant RLS even during initial bootstrap.
 await db.query("SELECT set_config('elo.organization_id',$1,true)",[orgId]);
 const secret=ci&&process.env.ELO_CI_MFA_SECRET?process.env.ELO_CI_MFA_SECRET:generateTotpSecret();
 let code;
 if(ci&&process.env.ELO_CI_MFA_SECRET){code=process.env.ELO_CI_MFA_CODE;}
 else{
  const uri='otpauth://totp/ELO%20360%20Global:'+encodeURIComponent(ELO_ADMIN_EMAIL)+'?secret='+secret+'&issuer=ELO%20360%20Global&digits=6&period=30';
  stdout.write('Configure o autenticador no seu dispositivo, em ambiente privado.\n');
  stdout.write('Segredo MFA (exibir uma única vez): '+secret+'\n');
  stdout.write('URI para configurar o autenticador: '+uri+'\n');
  rl=createInterface({input:stdin,output:stdout});
  code=await rl.question('Digite o código de seis dígitos exibido pelo autenticador: ');
 }
 const accepted=matchTotp(secret,code||'',{window:1});
 if(accepted===null)throw Error('Não foi possível confirmar MFA. Nenhuma conta criada.');
 const hash=await argon2.hash(ELO_ADMIN_PASSWORD,{type:argon2.argon2id});
 await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2)',[orgId,'ELO 360 Global']);
 await db.query('INSERT INTO elo.users(id,organization_id,email,display_name,password_hash,status) VALUES($1,$2,$3,$4,$5,$6)',
  [userId,orgId,ELO_ADMIN_EMAIL.toLowerCase(),'Administração ELO 360',hash,'active']);
 await db.query('INSERT INTO elo.platform_ownership(user_id) VALUES($1)',[userId]);
 await db.query("INSERT INTO elo.roles(code,description) VALUES('admin','Administração geral da ELO 360') ON CONFLICT(code) DO NOTHING");
 await db.query("INSERT INTO elo.user_roles(user_id,role_id) SELECT $1,id FROM elo.roles WHERE code='admin'",[userId]);
 await db.query('INSERT INTO elo.user_mfa(user_id,secret_encrypted,enabled,last_accepted_counter) VALUES($1,$2,TRUE,$3)',
  [userId,encryptTotpSecret(secret,MFA_ENCRYPTION_KEY,userId),accepted]);
 const codes=generateRecoveryCodes(8);
 for(const recovery of codes){
  await db.query('INSERT INTO elo.mfa_recovery_codes(organization_id,user_id,code_hash) VALUES($1,$2,$3)',
   [orgId,userId,recoveryCodeDigest(userId,recovery)]);
 }
 await db.query('COMMIT');
 stdout.write('Conta de administração com MFA confirmada. ID da organização: '+orgId+'\n');
 if(!ci){stdout.write('Códigos de recuperação: anote e guarde em local privado. Não fotografe ou compartilhe.\n');for(const recovery of codes)stdout.write(recovery+'\n');}
}catch(err){
 await db.query('ROLLBACK').catch(()=>{});
 console.error('Provisionamento interrompido:',err?.code||err?.message?.slice(0,140)||'unknown');
 process.exitCode=1;
}finally{rl?.close();await db.end().catch(()=>{});}
