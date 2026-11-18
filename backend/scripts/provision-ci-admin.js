// Conta administrativa APENAS PARA POSTGRESQL DESCARTÁVEL NO GITHUB ACTIONS.
// NÃO use para provisionamento de produção nem passe dados de clientes.
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import argon2 from 'argon2';
const {CI_ELO_DB,DATABASE_URL,ELO_CI_ORG_ID,ELO_CI_ADMIN_EMAIL,ELO_CI_ADMIN_PASSWORD}=process.env;
if(CI_ELO_DB!=='ephemeral'||!DATABASE_URL)throw Error('Somente CI ephemeral');
const url=new URL(DATABASE_URL);
if(url.hostname!=='127.0.0.1'||url.pathname!=='/elo360_ci')throw Error('Somente banco local elo360_ci');
if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(ELO_CI_ORG_ID||''))throw Error('Organização CI inválida');
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ELO_CI_ADMIN_EMAIL||''))throw Error('E-mail CI inválido');
if(typeof ELO_CI_ADMIN_PASSWORD!=='string'||ELO_CI_ADMIN_PASSWORD.length<16)throw Error('Senha de teste insuficiente');
const db=new pg.Client({connectionString:DATABASE_URL});
try{
 await db.connect();
 await db.query('BEGIN');
 await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[ELO_CI_ORG_ID,'Organização de Homologação Fictícia']);
 await db.query('INSERT INTO elo.roles(id,code,description) VALUES($1,$2,$3) ON CONFLICT(code) DO NOTHING',
  [randomUUID(),'admin','Administração CI descartável']);
 const passwordHash=await argon2.hash(ELO_CI_ADMIN_PASSWORD,{type:argon2.argon2id});
 const inserted=await db.query(
 'INSERT INTO elo.users(id,organization_id,email,display_name,password_hash,status) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(organization_id,email) DO NOTHING RETURNING id',
 [randomUUID(),ELO_CI_ORG_ID,ELO_CI_ADMIN_EMAIL,'Administrador Fictício CI',passwordHash,'active']);
 if(inserted.rowCount!==1)throw Error('Conta CI já existe: provisionamento deve ocorrer apenas uma vez');
 await db.query('INSERT INTO elo.user_roles(user_id,role_id) SELECT $1,id FROM elo.roles WHERE code=$2',[inserted.rows[0].id,'admin']);
 await db.query('COMMIT');
 console.log('Administrador fictício CI provisionado (sem exibir credenciais).');
}catch(err){
 await db.query('ROLLBACK').catch(()=>{});
 console.error('Falha no provisionamento descartável:',err?.code||err?.name||'unknown');
 process.exitCode=1;
}finally{await db.end().catch(()=>{});}
