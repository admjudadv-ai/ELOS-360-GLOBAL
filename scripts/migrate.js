"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {Client}=require("pg");
if(process.env.ALLOW_MIGRATION!=="YES") {console.error("Migration disabled. Set ALLOW_MIGRATION=YES for one authorized execution.");process.exit(2);}
if(!process.env.DATABASE_URL){console.error("DATABASE_URL missing. Set it in protected environment variables, never in code.");process.exit(2);}
(async()=>{
 const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
 try {
  await client.connect();
  const check=await client.query("SELECT to_regclass('elo.schema_migrations') AS table_name");
  if(check.rows[0].table_name){
   const done=await client.query("SELECT 1 FROM elo.schema_migrations WHERE version=$1",["001_initial"]);
   if(done.rowCount){console.log("Migration 001 already applied");return;}
  }
  const sql=fs.readFileSync(path.join(__dirname,"../db/001_initial.sql"),"utf8");
  await client.query(sql);
  console.log("Migration 001 applied");
 }catch(e){console.error("Migration failed:",e.message);process.exitCode=1;}
 finally {await client.end().catch(()=>{});}
})();
