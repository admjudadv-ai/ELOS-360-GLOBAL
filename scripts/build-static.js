"use strict";
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dest=path.join(root,'public-dist');
const allowlist=['index.html','painel.html','previdencia.html','acesso.html','servicos.html','banner-institucional.png','logo-horizontal.png','logo-circular.png'];
fs.rmSync(dest,{recursive:true,force:true});
fs.mkdirSync(dest,{recursive:true});
for(const file of allowlist){
 const source=path.join(root,file);
 if(!fs.existsSync(source)||!fs.statSync(source).isFile())throw Error('Public asset missing: '+file);
 fs.copyFileSync(source,path.join(dest,file));
}
const published=fs.readdirSync(dest);
if(published.length!==allowlist.length || published.some(f=>!allowlist.includes(f)))throw Error('Unexpected publication content');
console.log('Public assets prepared:',published.join(', '));
