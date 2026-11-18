// Safe, secret-free PostgreSQL diagnostics for first-time activation.
// Never embed original error.message, connection strings, hostnames or passwords.
export function safeConnectionDiagnostic(error){
 const code=typeof error?.code==='string'?error.code:'';
 if(code==='28P01')return 'ERRO_AUTENTICACAO_BANCO: usuário ou senha não conferem. Use uma credencial nova do Render.';
 if(code==='3D000')return 'ERRO_NOME_BANCO: nome do banco de dados não encontrado.';
 if(code==='42501')return 'ERRO_PERMISSAO_BANCO: credencial sem autorização suficiente.';
 if(code==='ENOTFOUND'||code==='EAI_AGAIN')return 'ERRO_ENDERECO_BANCO: endereço do servidor não resolvido. Verifique se usou External Database URL.';
 if(code==='ECONNREFUSED')return 'ERRO_CONEXAO_RECUSADA: servidor ou porta não aceita conexão.';
 if(code==='ETIMEDOUT'||code==='ETIMEOUT')return 'ERRO_CONEXAO_TEMPO: verifique conectividade e restrições de rede no Render.';
 if(code==='SELF_SIGNED_CERT_IN_CHAIN'||code==='DEPTH_ZERO_SELF_SIGNED_CERT'||code==='ERR_TLS_CERT_ALTNAME_INVALID')
   return 'ERRO_TLS_CERTIFICADO: validar certificado TLS. Nunca desabilitar verificação SSL.';
 if(code==='57P03')return 'ERRO_BANCO_INICIANDO: PostgreSQL temporariamente indisponível.';
 return 'ERRO_BANCO_NAO_CLASSIFICADO: conexão ou consulta falhou. Não compartilhe credenciais nem mensagens brutas com segredos.';
}
