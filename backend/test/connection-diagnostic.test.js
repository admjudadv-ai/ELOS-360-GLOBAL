import test from 'node:test';
import assert from 'node:assert/strict';
import {safeConnectionDiagnostic} from '../connection-diagnostic.js';
test('diagnostic categorizes common database errors without copying sensitive details',()=>{
 const secret='postgresql://user:very-secret@example.test/elo360_db';
 for(const [code,label] of [['28P01','ERRO_AUTENTICACAO_BANCO'],['3D000','ERRO_NOME_BANCO'],['42501','ERRO_PERMISSAO_BANCO'],['ENOTFOUND','ERRO_ENDERECO_BANCO'],['ECONNREFUSED','ERRO_CONEXAO_RECUSADA'],['ETIMEDOUT','ERRO_CONEXAO_TEMPO'],['SELF_SIGNED_CERT_IN_CHAIN','ERRO_TLS_CERTIFICADO']]){
  const output=safeConnectionDiagnostic({code,message:secret});
  assert.ok(output.startsWith(label));
  assert.equal(output.includes(secret),false);
  assert.equal(output.includes('very-secret'),false);
 }
 const unknown=safeConnectionDiagnostic({message:secret});
 assert.match(unknown,/ERRO_BANCO_NAO_CLASSIFICADO/);
 assert.equal(unknown.includes('example.test'),false);
});
