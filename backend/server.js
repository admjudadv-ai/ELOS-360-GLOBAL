import {allowedModules,hasModuleAccess,canOpenAdministration} from './permissions.js';
import {decryptTotpSecret,matchTotp} from './mfa.js';
import {digestToken,isValidSessionToken,validateLoginPayload,isAllowedMutationOrigin} from './security.js';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pg from 'pg';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse as parseCookie,serialize as serializeCookie } from 'cookie';

const {DATABASE_URL,APP_ORIGIN,NODE_ENV,PORT='3000',MFA_ENCRYPTION_KEY}=process.env;
const viewDir=join(dirname(fileURLToPath(import.meta.url)),'views');
async function htmlView(res,name){const markup=await readFile(join(viewDir,name),'utf8');res.set('Cache-Control','no-store').type('html').send(markup);}
if(!DATABASE_URL || !APP_ORIGIN) throw Error('Configure DATABASE_URL e APP_ORIGIN no provedor, nunca no GitHub');
const origin=new URL(APP_ORIGIN).origin;
const production=NODE_ENV==='production';
if(production && !origin.startsWith('https://')) throw Error('HTTPS obrigatório');
const db=new pg.Pool({connectionString:DATABASE_URL,max:5,connectionTimeoutMillis:10000});
const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({limit:'12kb'}));
const cname=production?'__Host-elo360sid':'elo360sid';
const challengeName=production?'__Host-elo360pending':'elo360pending';
function sendCookie(res,name,value,age){res.append('Set-Cookie',serializeCookie(name,value,{httpOnly:true,secure:production,sameSite:'strict',path:'/',maxAge:age}));}
function cookie(res,value,age=28800){sendCookie(res,cname,value,age);}
function pendingCookie(res,value,age=300){sendCookie(res,challengeName,value,age);}
app.use((req,res,next)=>{
 if(!isAllowedMutationOrigin(req.method,req.get('origin'),origin))
  return res.status(403).json({error:'Origem não autorizada'});
 next();
});
const limiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false});
app.get('/health',(_req,res)=>res.json({status:'running',productionReady:false}));
// A raiz do serviço apresenta a entrada de homologação, não um erro 404.
app.get('/',(_req,res)=>res.redirect(302,'/login'));
app.get('/login',async(_req,res,next)=>{try{await htmlView(res,'login.html');}catch(err){next(err);}});
app.get('/login.js',(_req,res)=>res.set('Cache-Control','no-store').sendFile(join(viewDir,'login.js')));
app.get('/admin.js',(_req,res)=>res.set('Cache-Control','no-store').sendFile(join(viewDir,'admin.js')));
app.post('/api/auth/login',limiter,async(req,res,next)=>{
 try{
  const {organizationId,email,password}=req.body||{};
  if(!validateLoginPayload({organizationId,email,password}))
     return res.status(400).json({error:'Dados inválidos'});
  const {rows}=await db.query('SELECT id,password_hash,status FROM elo.users WHERE organization_id=$1 AND lower(email)=lower($2)',[organizationId,email.trim()]);
  const u=rows[0];
  if(!u||u.status!=='active'||!u.password_hash||!(await argon2.verify(u.password_hash,password)))
    return res.status(401).json({error:'Credenciais inválidas'});
  // MFA enabled: issuing a full login session at this stage is prohibited.
  const factors=await db.query('SELECT enabled FROM elo.user_mfa WHERE user_id=$1',[u.id]);
  if(factors.rows[0]?.enabled){
   if(!MFA_ENCRYPTION_KEY)return res.status(503).json({error:'Autenticação adicional indisponível'});
   const challenge=randomBytes(32).toString('hex');
   await db.query("INSERT INTO elo.mfa_challenges(challenge_hash,user_id,expires_at) VALUES($1,$2,now()+interval '5 minutes')",[digestToken(challenge),u.id]);
   cookie(res,'',0);
   pendingCookie(res,challenge);
   return res.status(202).json({mfaRequired:true});
  }
  const token=randomBytes(32).toString('hex');
  await db.query("INSERT INTO elo.auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[digestToken(token),u.id]);
  pendingCookie(res,'',0);cookie(res,token);
  res.json({ok:true});
 }catch(e){next(e);}
});
app.post('/api/auth/mfa/verify',limiter,async(req,res,next)=>{
 const pending=parseCookie(req.get('cookie')||'')[challengeName];
 if(!isValidSessionToken(pending))return res.status(401).json({error:'Desafio inválido'});
 const code=req.body?.code;
 if(typeof code!=='string'||!/^\d{6}$/.test(code))return res.status(400).json({error:'Código inválido'});
 if(!MFA_ENCRYPTION_KEY)return res.status(503).json({error:'Autenticação adicional indisponível'});
 const client=await db.connect().catch(next);
 if(!client)return;
 try{
  await client.query('BEGIN');
  // Lock the challenge so concurrent redemptions cannot both complete.
  const result=await client.query(`SELECT c.user_id,c.attempts,f.secret_encrypted,f.last_accepted_counter
   FROM elo.mfa_challenges c JOIN elo.user_mfa f ON f.user_id=c.user_id
   JOIN elo.users u ON u.id=c.user_id
   WHERE c.challenge_hash=$1 AND c.expires_at>now() AND c.attempts<5
     AND f.enabled=TRUE AND u.status='active'
   FOR UPDATE OF c,f`,[digestToken(pending)]);
  const ch=result.rows[0];
  if(!ch){await client.query('ROLLBACK');pendingCookie(res,'',0);return res.status(401).json({error:'Desafio inválido ou expirado'});}
  await client.query('UPDATE elo.mfa_challenges SET attempts=attempts+1 WHERE challenge_hash=$1',[digestToken(pending)]);
  const secret=decryptTotpSecret(ch.secret_encrypted,MFA_ENCRYPTION_KEY,ch.user_id);
  const accepted=matchTotp(secret,code,{lastAcceptedCounter:Number(ch.last_accepted_counter)});
  if(accepted===null){
   await client.query('COMMIT');return res.status(401).json({error:'Código inválido'});
  }
  const updated=await client.query('UPDATE elo.user_mfa SET last_accepted_counter=$1 WHERE user_id=$2 AND last_accepted_counter<$1',[accepted,ch.user_id]);
  if(updated.rowCount!==1){await client.query('ROLLBACK');return res.status(401).json({error:'Código já utilizado'});}
  const token=randomBytes(32).toString('hex');
  await client.query("INSERT INTO elo.auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[digestToken(token),ch.user_id]);
  await client.query('DELETE FROM elo.mfa_challenges WHERE challenge_hash=$1',[digestToken(pending)]);
  await client.query('COMMIT');
  pendingCookie(res,'',0);cookie(res,token);
  return res.json({ok:true});
 }catch(e){await client.query('ROLLBACK').catch(()=>{});next(e);}
 finally{client.release();}
});
async function authenticated(req,res,next){
 try{
  const token=parseCookie(req.get('cookie')||'')[cname];
  if(!token||!isValidSessionToken(token))return res.status(401).json({error:'Não autenticado'});
  const {rows}=await db.query(`SELECT u.id,u.email,u.organization_id,
   CASE WHEN po.user_id IS NOT NULL
    THEN array_append(COALESCE(array_remove(array_agg(DISTINCT r.code),NULL),'{}'),'platform_owner')
    ELSE COALESCE(array_remove(array_agg(DISTINCT r.code),NULL),'{}') END AS roles
   FROM elo.auth_sessions s JOIN elo.users u ON u.id=s.user_id
   LEFT JOIN elo.user_roles ur ON ur.user_id=u.id LEFT JOIN elo.roles r ON r.id=ur.role_id
   LEFT JOIN elo.platform_ownership po ON po.user_id=u.id
   WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active'
   GROUP BY u.id,po.user_id`,[digestToken(token)]);
  if(!rows.length)return res.status(401).json({error:'Sessão inválida'});
  req.user=rows[0];next();
 }catch(e){next(e);}
}
app.get('/api/auth/me',authenticated,(req,res)=>res.json(req.user));
app.get('/api/modules',authenticated,(req,res)=>res.json({modules:allowedModules(req.user.roles)}));
app.get('/api/modules/:code/check',authenticated,(req,res)=>hasModuleAccess(req.user.roles,req.params.code)?res.json({allowed:true,module:req.params.code}):res.status(403).json({error:'Sem permissão'}));
app.get('/api/admin/check',authenticated,(req,res)=>canOpenAdministration(req.user.roles)?res.json({ok:true}):res.status(403).json({error:'Sem permissão'}));
app.get('/admin',authenticated,async(req,res,next)=>{
 if(!canOpenAdministration(req.user.roles))return res.status(403).json({error:'Sem permissão'});
 try{await htmlView(res,'admin.html');}catch(err){next(err);}
});
app.post('/api/auth/logout',async(req,res,next)=>{
 try{
  const token=parseCookie(req.get('cookie')||'')[cname];
  if(token&&isValidSessionToken(token))await db.query('DELETE FROM elo.auth_sessions WHERE token_hash=$1',[digestToken(token)]);
  cookie(res,'',0);pendingCookie(res,'',0);
  res.json({ok:true});
 }catch(e){next(e);}
});
app.use((err,req,res,next)=>{console.error('API error',err?.code||err?.name||'unknown');res.status(500).json({error:'Erro interno'});});
// Diagnóstico somente leitura do ambiente isolado de homologação.
async function checkStagingSchema(){
 const expectedDatabase='elo360_auth_staging_db';
 const expected=['001_initial','002_auth_sessions','003_tenant_rls','004_tenant_relationships',
  '005_mfa_recovery','006_mfa_challenge','007_exclusive_owner','008_financial_accounts_funds'];
 try{
  const result=await db.query("SELECT current_database() AS database, to_regclass('elo.schema_migrations') IS NOT NULL AS migration_table");
  if(result.rows[0].database!==expectedDatabase){
   console.error('Homologação: banco inesperado; diagnóstico de migrações interrompido');
   return;
  }
  if(!result.rows[0].migration_table){
   console.warn('Homologação: banco isolado acessível; tabela de migrações ausente');
   return;
  }
  const versions=await db.query('SELECT version FROM elo.schema_migrations ORDER BY version');
  const applied=versions.rows.map(row=>row.version);
  const missing=expected.filter(version=>!applied.includes(version));
  const unknown=applied.filter(version=>!expected.includes(version));
  console.log('Homologação: migrações verificadas',JSON.stringify({applied:applied.length,missing,unknown}));
 }catch(error){
  console.error('Homologação: consulta de prontidão falhou',error?.code||error?.name||'unknown');
 }
}
app.listen(Number(PORT),'0.0.0.0',()=>{
 console.log('API ELOS 360 de autenticação iniciada');
 void checkStagingSchema();
});
