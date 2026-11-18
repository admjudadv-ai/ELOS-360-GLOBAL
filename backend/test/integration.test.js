import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import argon2 from 'argon2';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const origin = 'https://elo360.example.test';
const port = 31577;
const base = 'http://127.0.0.1:' + port;
const org = '11111111-2222-4333-8444-555555555555';
const user = '22222222-3333-4444-8555-666666666666';
const role = '33333333-4444-4555-8666-777777777777';
const otherOrg = '44444444-5555-4666-8777-888888888888';
const otherUser = '55555555-6666-4777-8888-999999999999';
const ciOrg = '66666666-7777-4888-8999-aaaaaaaaaaaa';
const password = 'Ficticia!SemDadosReais#123';

test('login, sessões, permissões e logout usando PostgreSQL descartável', {timeout: 60000}, async () => {
  assert.equal(process.env.CI_ELO_DB, 'ephemeral', 'Proibido conectar este teste a qualquer banco real');
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString, 'DATABASE_URL ausente');
  const parsed = new URL(connectionString);
  assert.equal(parsed.hostname, '127.0.0.1', 'O teste só pode usar PostgreSQL local');
  assert.equal(parsed.pathname, '/elo360_ci', 'O teste exige o banco descartável elo360_ci');

  const db = new pg.Client({connectionString});
  let child;
  let output = '';
  try {
    await db.connect();
    // SQL versionado, em banco CI descartável, sem criar tabelas no Render.
    for (const file of ['001_initial.sql','002_auth_sessions.sql','006_mfa_challenge.sql','007_exclusive_owner.sql']) {
      const sql = fs.readFileSync(path.join(root,'db',file),'utf8');
      await db.query(sql);
    }
    const applied = await db.query('SELECT version FROM elo.schema_migrations ORDER BY version');
    assert.deepEqual(applied.rows.map(r => r.version), ['001_initial','002_auth_sessions','006_mfa_challenge','007_exclusive_owner']);

    await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2)', [org,'Organização Fictícia CI']);
    await db.query('INSERT INTO elo.users(id,organization_id,email,display_name,password_hash,status) VALUES($1,$2,$3,$4,$5,$6)',
      [user,org,'teste@example.test','Usuário Fictício',await argon2.hash(password),'active']);
    await db.query('INSERT INTO elo.roles(id,code,description) VALUES($1,$2,$3)',
      [role,'admin','Administrador fictício CI']);
    await db.query('INSERT INTO elo.user_roles(user_id,role_id) VALUES($1,$2)',[user,role]);
    await db.query('INSERT INTO elo.organizations(id,name) VALUES($1,$2)',[otherOrg,'Outra Organização Fictícia']);
    await db.query('INSERT INTO elo.users(id,organization_id,email,display_name,password_hash,status) VALUES($1,$2,$3,$4,$5,$6)',
      [otherUser,otherOrg,'outro@example.test','Usuário Sem Permissões',await argon2.hash(password),'active']);

    // Exercitar bootstrap CI no banco descartável, sem exibir senha em logs.
    execFileSync(process.execPath,[path.join(root,'backend/scripts/provision-ci-admin.js')],{
      cwd:path.join(root,'backend'),
      env:{...process.env,ELO_CI_ORG_ID:ciOrg,ELO_CI_ADMIN_EMAIL:'bootstrap@example.test',ELO_CI_ADMIN_PASSWORD:password}
    });
    const provisioned=await db.query(
      "SELECT u.status, r.code FROM elo.users u JOIN elo.user_roles ur ON ur.user_id=u.id JOIN elo.roles r ON r.id=ur.role_id WHERE u.organization_id=$1 AND u.email=$2",
      [ciOrg,'bootstrap@example.test']
    );
    assert.deepEqual(provisioned.rows,[{status:'active',code:'admin'}]);

    child = spawn(process.execPath, ['server.js'],{
      cwd:path.join(root,'backend'),
      env:{...process.env, NODE_ENV:'test', APP_ORIGIN:origin, PORT:String(port)},
      stdio:['ignore','pipe','pipe']
    });
    child.stdout.on('data', c=>{output+=String(c).slice(0,400);});
    child.stderr.on('data', c=>{output+=String(c).slice(0,400);});
    let ready=false;
    for (let i=0;i<80;i++) {
      if(child.exitCode!==null)break;
      try {
        const r=await fetch(base+'/health');
        if(r.ok){ready=true;break;}
      } catch {}
      await sleep(200);
    }
    assert.ok(ready,'Servidor de teste não iniciou: '+output.slice(0,500));

    const json = (body)=>JSON.stringify(body);
    const headers={'Content-Type':'application/json',Origin:origin};
    const loginBody={organizationId:org,email:'teste@example.test',password};

    let r=await fetch(base+'/login');
    assert.equal(r.status,200);
    assert.match(await r.text(),/Acesso administrativo seguro/);
    r=await fetch(base+'/admin');
    assert.equal(r.status,401,'Tela administrativa deve exigir sessão');
    r=await fetch(base+'/api/auth/me');
    assert.equal(r.status,401,'Acesso sem autenticação deve ser recusado');

    r=await fetch(base+'/api/auth/login',{method:'POST',headers:{...headers,Origin:'https://intruso.example.test'},body:json(loginBody)});
    assert.equal(r.status,403,'Origem não autorizada');

    r=await fetch(base+'/api/auth/login',{method:'POST',headers,body:json({...loginBody,password:'IncorretaFicticia'})});
    assert.equal(r.status,401,'Senha incorreta deve falhar');

    r=await fetch(base+'/api/auth/login',{method:'POST',headers,body:json({...loginBody,organizationId:otherOrg})});
    assert.equal(r.status,401,'Organizações diferentes não compartilham usuários');

    r=await fetch(base+'/api/auth/login',{method:'POST',headers,body:json(loginBody)});
    assert.equal(r.status,200,'Login de usuário de testes');
    const setCookie=r.headers.get('set-cookie');
    assert.match(setCookie,/elo360sid=[0-9a-f]{64}/);
    assert.match(setCookie,/httponly/i);
    assert.match(setCookie,/samesite=strict/i);
    const cookie=setCookie.match(/elo360sid=[0-9a-f]{64}/)?.[0];
    assert.ok(cookie,'A sessão plena deve ser extraída do cookie correto');
    const sessionToken=cookie.split('=')[1];
    const stored=await db.query('SELECT token_hash FROM elo.auth_sessions WHERE user_id=$1',[user]);
    assert.equal(stored.rowCount,1);
    assert.notEqual(stored.rows[0].token_hash.trim(),sessionToken,'Token em claro não pode ir ao banco');

    r=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});
    assert.equal(r.status,200);
    const me=await r.json();
    assert.equal(me.email,'teste@example.test');
    assert.ok(me.roles.includes('admin'));

    r=await fetch(base+'/api/admin/check',{headers:{Cookie:cookie}});
    assert.equal(r.status,200,'Perfil admin reconhecido');
    r=await fetch(base+'/api/modules',{headers:{Cookie:cookie}});
    assert.equal(r.status,200);
    const modules=(await r.json()).modules;
    assert.equal(modules.length,9,'Admin habilitado para nove módulos de demonstração');
    r=await fetch(base+'/api/modules/financeiro/check',{headers:{Cookie:cookie}});
    assert.equal(r.status,200);
    r=await fetch(base+'/api/modules/atendimento/check',{headers:{Cookie:cookie}});
    assert.equal(r.status,403);
    r=await fetch(base+'/admin',{headers:{Cookie:cookie}});
    assert.equal(r.status,200,'Administrador deve acessar painel protegido');
    assert.match(await r.text(),/ELO 360 GLOBAL — Administração/);

    // Sessão deve perder validade ao expirar, mesmo se cookie ainda estiver presente.
    await db.query("UPDATE elo.auth_sessions SET expires_at=now()-interval '1 minute' WHERE user_id=$1",[user]);
    r=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});
    assert.equal(r.status,401,'Sessão expirada deve ser recusada');
    await db.query("UPDATE elo.auth_sessions SET expires_at=now()+interval '1 hour' WHERE user_id=$1",[user]);

    // Desabilitar a conta invalida imediatamente sessões já emitidas.
    await db.query("UPDATE elo.users SET status='disabled' WHERE id=$1",[user]);
    r=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});
    assert.equal(r.status,401,'Usuário desabilitado deve perder acesso');
    await db.query("UPDATE elo.users SET status='active' WHERE id=$1",[user]);

    // Um usuário autenticado sem papel admin não pode ler a rota administrativa.
    r=await fetch(base+'/api/auth/login',{method:'POST',headers,body:json({...loginBody,organizationId:otherOrg,email:'outro@example.test'})});
    assert.equal(r.status,200);
    const secondCookie=r.headers.get('set-cookie').match(/elo360sid=[0-9a-f]{64}/)?.[0];
    assert.ok(secondCookie);
    r=await fetch(base+'/api/admin/check',{headers:{Cookie:secondCookie}});
    assert.equal(r.status,403,'Usuário sem papel admin não pode acessar administração');
    r=await fetch(base+'/admin',{headers:{Cookie:secondCookie}});
    assert.equal(r.status,403,'Usuário sem papel admin não pode acessar HTML privado');
    r=await fetch(base+'/api/modules',{headers:{Cookie:secondCookie}});
    assert.deepEqual((await r.json()).modules,[],'Usuário sem papel não recebe módulos');
    r=await fetch(base+'/api/modules/financeiro/check',{headers:{Cookie:secondCookie}});
    assert.equal(r.status,403,'Sem papel financeiro deve ser proibido');
    r=await fetch(base+'/api/auth/logout',{method:'POST',headers:{...headers,Cookie:secondCookie}});
    assert.equal(r.status,200);

    r=await fetch(base+'/api/auth/logout',{method:'POST',headers:{...headers,Cookie:cookie}});
    assert.equal(r.status,200,'Logout');
    r=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});
    assert.equal(r.status,401,'Sessão revogada não pode ser reutilizada');
    r=await fetch(base+'/admin',{headers:{Cookie:cookie}});
    assert.equal(r.status,401,'Painel deve ficar inacessível após logout');
  } finally {
    if(child) {
      child.kill('SIGTERM');
      await sleep(100);
      if(child.exitCode===null)child.kill('SIGKILL');
    }
    await db.end().catch(()=>{});
  }
});
