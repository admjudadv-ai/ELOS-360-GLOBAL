"use strict";
const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('static build exposes only explicitly approved HTML/images',()=>{
 execFileSync(process.execPath,[path.join(root,'scripts/build-static.js')],{cwd:root});
 const actual=fs.readdirSync(path.join(root,'public-dist')).sort();
 assert.deepEqual(actual,['acesso.html','servicos.html','banner-institucional.png','index.html','logo-circular.png','logo-horizontal.png','painel.html','previdencia.html'].sort());
 for(const file of ['package.json','.gitignore','backend','db','scripts','DEPLOYMENT.md','api','docs'])assert.ok(!actual.includes(file),'must not publish '+file);
});
test('frontend remains explicitly demonstrative',()=>{
 const previdencia=fs.readFileSync(path.join(root,'previdencia.html'),'utf8');
 assert.match(previdencia,/Ambiente demonstrativo/);
 assert.match(previdencia,/dados fictícios/);
});

test('access preview is explicitly non-authenticating and collects no credentials',()=>{
 const preview=fs.readFileSync(path.join(root,'acesso.html'),'utf8');
 assert.match(preview,/Não existe login ativo/);
 assert.doesNotMatch(preview,/<input[^>]+type=["']password/i);
 assert.match(preview,/textContent/);
 assert.ok(!preview.includes("fetch("),"Preview must not contact a backend");
});

test('public services catalog is read-only and does not capture personal data',()=>{
 const html=fs.readFileSync(path.join(root,'servicos.html'),'utf8');
 assert.match(html,/Pesquisar serviços e áreas/);
 assert.match(html,/Informações institucionais reais/);
 assert.match(html,/ELORA/);
 assert.doesNotMatch(html,/<form\b/i);
 assert.doesNotMatch(html,/\bfetch\s*\(/i);
 assert.doesNotMatch(html,/<input[^>]+type=["'](?:password|file|email)/i);
});

test('homepage banner and all modules navigate to real catalog anchors',()=>{
 const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const catalog=fs.readFileSync(path.join(root,'servicos.html'),'utf8');
 const links=[...homepage.matchAll(/href="servicos\.html#([a-z]+)"/g)].map(match=>match[1]);
 assert.deepEqual(links.sort(),['previdencia','juridico','saude','educacao','empresarial','financeiro','network','investidores','cooperacao'].sort());
 for(const anchor of links)assert.ok(catalog.includes('id="'+anchor+'"'),'destination missing: '+anchor);
 assert.match(homepage,/class="banner-link"/);
 assert.match(homepage,/aria-label="Explorar todas as áreas/);
});
