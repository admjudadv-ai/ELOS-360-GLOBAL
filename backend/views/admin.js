"use strict";
const identity=document.querySelector("#identity");
const message=document.querySelector("#message");
async function session(){
 try{
  const r=await fetch("/api/auth/me",{credentials:"same-origin",cache:"no-store"});
  if(!r.ok){window.location.replace("/login");return;}
  const user=await r.json();
  if(!Array.isArray(user.roles)||!user.roles.includes("admin")&&!user.roles.includes("platform_owner")){window.location.replace("/login");return;}
  identity.textContent=(user.roles.includes("platform_owner")?"Administradora principal • ":"Usuário: ")+user.email+" • Organização: "+user.organization_id;
 }catch{identity.textContent="Não foi possível verificar a sessão.";}
}
document.querySelector("#logout").addEventListener("click",async()=>{
 try{const r=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin",cache:"no-store"});if(!r.ok){message.textContent="Não foi possível encerrar a sessão.";return;}window.location.replace("/login");}
 catch{message.textContent="Falha de comunicação ao encerrar sessão.";}
});
session();
