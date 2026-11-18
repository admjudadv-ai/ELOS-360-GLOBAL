"use strict";
const form=document.querySelector("#login-form");
const challengeForm=document.querySelector("#mfa-form");
const message=document.querySelector("#message");
const button=document.querySelector("#submit");
const mfaButton=document.querySelector("#mfa-submit");
form.addEventListener("submit",async(event)=>{
 event.preventDefault();
 button.disabled=true;message.textContent="Verificando acesso...";
 const body={organizationId:form.elements.organizationId.value.trim(),email:form.elements.email.value.trim(),password:form.elements.password.value};
 try{
  const result=await fetch("/api/auth/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
  form.elements.password.value="";
  if(result.status===202){
   const data=await result.json();
   if(data.mfaRequired===true){form.hidden=true;challengeForm.hidden=false;message.textContent="Informe o código temporário para concluir o acesso.";return;}
  }
  if(!result.ok){message.textContent=result.status===401?"Credenciais inválidas.":"Não foi possível autenticar.";return;}
  window.location.assign("/admin");
 }catch{message.textContent="Falha de comunicação com o servidor.";}
 finally{body.password="";button.disabled=false;}
});
challengeForm.addEventListener("submit",async(event)=>{
 event.preventDefault();mfaButton.disabled=true;message.textContent="Confirmando segundo fator...";
 const body={code:challengeForm.elements.code.value.trim()};
 try{
  const result=await fetch("/api/auth/mfa/verify",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
  challengeForm.elements.code.value="";
  if(!result.ok){message.textContent="Código inválido ou desafio expirado. Se necessário, inicie o acesso novamente.";return;}
  window.location.assign("/admin");
 }catch{message.textContent="Falha de comunicação ao validar o código.";}
 finally{body.code="";mfaButton.disabled=false;}
});
