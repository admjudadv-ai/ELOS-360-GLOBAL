import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pg from 'pg';
import argon2 from 'argon2';
import { randomBytes,createHash } from 'node:crypto';
import { parse as parseCookie,serialize as serializeCookie } from 'cookie';

const {DATABASE_URL,APP_ORIGIN,NODE_ENV,PORT='3000'}=process.env;
if(!DATABASE_URL || !APP_ORIGIN) throw Error('Configure DATABASE_URL e APP_ORIGIN no provedor, nunca no GitHub');
const origin=new URL(APP_ORIGIN).origin;
const production=NODE_ENV==='production';
if(production && !origin.startsWith('https://')) throw Error('HTTPS obrigatório');
const db=new pg.Pool({connectionString:DATABASE_URL,max:10});
const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({limit:'12kb'}));
const cname=production?'__Host-elo360sid':'elo360sid';
const digest=t=>createHash('sha256').update(t).digest('hex');
function cookie(res,value,age=28800){res.append('Set-Cookie',serializeCookie(cname,value,{httpOnly:true,secure:production,sameSite:'strict',path:'/',maxAge:age}));}
app.use((req,res,next)=>{
 if(['POST','PUT','PATCH','DELETE'].includes(req.method) && req.get('origin')!==origin)
  return res.status(403).json({error:'Origem não autorizada'});
 next();
});
const limiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false});
app.get('/health',(_req,res)=>res.json({status:'running',productionReady:false}));
app.post('/api/auth/login',limiter,async(req,res,next)=>{
 try{
  const {organizationId,email,password}=req.body||{};
  if(typeof organizationId!=='string'||!/^[a-f0-9-]{36}$/i.test(organizationId)||
     typeof email!=='string'||email.length>254||typeof password!=='string'||password.length>1024)
     return res.status(400).json({error:'Dados inválidos'});
  const {rows}=await db.query('SELECT id,password_hash,status FROM auth_users WHERE organization_id=$1 AND lower(email)=lower($2)',[organizationId,email.trim()]);
  const u=rows[0];
  if(!u||u.status!=='active'||!(await argon2.verify(u.password_hash,password)))
    return res.status(401).json({error:'Credenciais inválidas'});
  const token=randomBytes(32).toString('hex');
  await db.query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[digest(token),u.id]);
  cookie(res,token);
  res.json({ok:true});
 }catch(e){next(e);}
});
async function authenticated(req,res,next){
 try{
  const token=parseCookie(req.get('cookie')||'')[cname];
  if(!token||!/^[a-f0-9]{64}$/.test(token))return res.status(401).json({error:'Não autenticado'});
  const {rows}=await db.query(`SELECT u.id,u.email,u.organization_id,COALESCE(array_remove(array_agg(r.role),NULL),'{}') AS roles
   FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id
   LEFT JOIN auth_roles r ON r.user_id=u.id
   WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active'
   GROUP BY u.id`,[digest(token)]);
  if(!rows.length)return res.status(401).json({error:'Sessão inválida'});
  req.user=rows[0];next();
 }catch(e){next(e);}
}
app.get('/api/auth/me',authenticated,(req,res)=>res.json(req.user));
app.get('/api/admin/check',authenticated,(req,res)=>req.user.roles.includes('admin')?res.json({ok:true}):res.status(403).json({error:'Sem permissão'}));
app.post('/api/auth/logout',async(req,res,next)=>{
 try{
  const token=parseCookie(req.get('cookie')||'')[cname];
  if(token&&/^[a-f0-9]{64}$/.test(token))await db.query('DELETE FROM auth_sessions WHERE token_hash=$1',[digest(token)]);
  cookie(res,'',0);
  res.json({ok:true});
 }catch(e){next(e);}
});
app.use((err,req,res,next)=>{console.error('API error',err?.code||err?.name||'unknown');res.status(500).json({error:'Erro interno'});});
app.listen(Number(PORT),()=>console.log('API ELO 360 iniciada'));
