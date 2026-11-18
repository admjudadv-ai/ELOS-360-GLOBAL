"use strict";
const http = require("node:http");
const host = "0.0.0.0";
const port = Number(process.env.PORT || 10000);
const headers = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer"};
const server = http.createServer((req,res)=>{
  const path = (req.url || "").split("?")[0];
  if (req.method !== "GET") {res.writeHead(405,{...headers,Allow:"GET"});return res.end(JSON.stringify({error:"Método não permitido"}));}
  if (path === "/health") {res.writeHead(200,headers);return res.end(JSON.stringify({status:"ok",service:"elo360-api"}));}
  if (path === "/api/status") {res.writeHead(200,headers);return res.end(JSON.stringify({name:"ELO 360 GLOBAL",stage:"demonstracao",databaseConfigured:Boolean(process.env.DATABASE_URL),features:"Nenhum dado real aceito nesta versão"}));}
  res.writeHead(404,headers);res.end(JSON.stringify({error:"Rota não encontrada"}));
});
server.requestTimeout=10000;
server.headersTimeout=10000;
server.listen(port,host,()=>console.log("ELO 360 API listening on port "+port));
