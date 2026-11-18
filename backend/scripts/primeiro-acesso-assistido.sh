#!/usr/bin/env bash
# ELO 360: assistente interativo LOCAL para a PRIMEIRA configuração.
# Não chamar em CI, build ou deploy. Não imprime a URL nem a senha.
set -Eeuo pipefail
umask 077
if [[ ! -t 0 || ! -t 1 ]]; then
  echo "Este assistente exige terminal interativo privado." >&2
  exit 1
fi
if [[ "${CI:-}" == "true" ]]; then
  echo "Não executar com CI=true." >&2
  exit 1
fi
if [[ ! -f "scripts/migrate-empty-db.js" || ! -f "scripts/bootstrap-admin-mfa.js" ]]; then
  echo "Abra a pasta backend antes de executar este assistente." >&2
  exit 1
fi
if [[ ! -d node_modules ]]; then
  echo "Dependências não instaladas; execute npm install na pasta backend." >&2
  exit 1
fi
cleanup(){
  unset DATABASE_URL ELO_ADMIN_EMAIL ELO_ADMIN_PASSWORD MFA_ENCRYPTION_KEY
  unset ELO_DB_EXPECTED_NAME ELO_DB_MIGRATION_ACK ELO_BOOTSTRAP_APPROVAL
}
trap cleanup EXIT
echo "ELO 360 | Configuração inicial de PostgreSQL e MFA (homologação)"
echo "ATENÇÃO: não execute em ambiente compartilhado; não grave vídeo ou captura de tela."
echo "Não serão solicitados dados reais de clientes."
echo "Você precisa ter validado o banco VAZIO e a possibilidade de recuperação."
read -r -p "Nome do banco (exatamente como no Render): " ELO_DB_EXPECTED_NAME
if [[ ! "${ELO_DB_EXPECTED_NAME}" =~ ^[A-Za-z0-9_]{1,63}$ ]]; then
 echo "Nome de banco inválido." >&2; exit 1
fi
echo "Cole a URL EXTERNA da nova credencial elo360_app. A entrada fica OCULTA."
read -rs -p "DATABASE_URL (oculta): " DATABASE_URL
printf '\n'
if [[ -z "${DATABASE_URL}" ]]; then echo "URL ausente. Cole a URL apenas depois do pedido DATABASE_URL (oculta)." >&2; exit 1; fi
# Confirm input shape without displaying, recording or logging credential values.
if ! DATABASE_URL="$DATABASE_URL" ELO_DB_EXPECTED_NAME="$ELO_DB_EXPECTED_NAME" node --input-type=module -e '
  const raw=process.env.DATABASE_URL;
  let u;
  try{u=new URL(raw);}catch{console.error("ERRO_URL_FORMATO: o texto colado não é uma URL válida.");process.exit(2);}
  if(!["postgres:","postgresql:"].includes(u.protocol)){
    console.error("ERRO_URL_TIPO: copiou um texto que não é uma URL PostgreSQL.");process.exit(2);
  }
  if(!u.hostname||!u.username||!u.password){
    console.error("ERRO_URL_INCOMPLETA: a URL copiada não possui host, usuário ou senha.");process.exit(2);
  }
  if(decodeURIComponent(u.pathname.slice(1))!==process.env.ELO_DB_EXPECTED_NAME){
    console.error("ERRO_URL_BANCO: a URL é de um banco diferente do nome informado.");process.exit(2);
  }
  if(u.username==="elo360_admin"){
    console.error("ERRO_CREDENCIAL_ANTIGA: copie a URL externa da nova credencial, não de elo360_admin.");process.exit(2);
  }
  console.log("Formato, usuário e nome do banco conferidos sem exibir dados secretos.");
'; then
 echo "A conexão NÃO foi tentada. Volte ao Render e copie a External Database URL correta." >&2
 exit 1
fi
export DATABASE_URL ELO_DB_EXPECTED_NAME
echo "Verificando o banco sem escrita..."
db_report="$(node scripts/check-db-readiness.js)" || { echo "Conexão não verificada. Nenhuma tabela foi criada." >&2; exit 1; }
# The report is intentionally metadata only: never contains passwords, URLs or client records.
printf '%s\n' "$db_report"
db_state="$(DB_REPORT="$db_report" node -e '
const r=JSON.parse(process.env.DB_REPORT);
const expected=8;
if(r.unknownMigrations?.length) process.stdout.write("STOP");
else if(!r.schemaPresent&&r.tableCount===0&&r.appliedMigrations?.length===0) process.stdout.write("EMPTY");
else if(r.schemaPresent&&r.missingMigrations?.length===0&&r.appliedMigrations?.length===expected) process.stdout.write("READY");
else process.stdout.write("STOP");
')"
unset db_report
case "$db_state" in
 EMPTY)
   echo "O banco está sem tabelas. A instalação inicial precisará de sua confirmação."
   echo "Confirme a possibilidade de recuperação antes de autorizar gravação."
   read -r -p "Digite BANCO_VAZIO_REVISADO para instalar as oito migrações: " firstAck
   if [[ "$firstAck" != "BANCO_VAZIO_REVISADO" ]]; then echo "Instalação cancelada sem gravar."; exit 1; fi
   export ELO_DB_MIGRATION_ACK="EU_AUTORIZO_MIGRACAO_INICIAL_ELO360_BANCO_VAZIO"
   node scripts/migrate-empty-db.js
   unset ELO_DB_MIGRATION_ACK
   node scripts/check-db-readiness.js
   ;;
 READY)
   echo "As oito migrações já estão instaladas. Pulando instalação para não sobrescrever dados."
   ;;
 STOP)
   echo "Estado do banco inesperado ou parcialmente instalado. Interrompido sem modificações."
   exit 1
   ;;
esac
echo "Agora prepare a conta administrativa. Não use uma senha reutilizada."
read -r -p "E-mail da primeira administradora: " ELO_ADMIN_EMAIL
read -rs -p "Nova senha forte (mínimo 16 caracteres, oculta): " ELO_ADMIN_PASSWORD; printf '\n'
read -rs -p "Repita a senha (oculta): " confirmPassword; printf '\n'
if [[ "${ELO_ADMIN_PASSWORD}" != "${confirmPassword}" ]]; then
 echo "As senhas não correspondem." >&2; exit 1
fi
unset confirmPassword
if (( ${#ELO_ADMIN_PASSWORD} < 16 )); then echo "Senha curta." >&2; exit 1; fi
echo "Gerando chave de cifragem MFA. Guarde-a num gerenciador seguro; será exigida também na configuração da API."
MFA_ENCRYPTION_KEY="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
echo "CHAVE MFA (exibição única; NÃO COMPARTILHAR): ${MFA_ENCRYPTION_KEY}"
read -r -p "Depois de guardar a chave em local seguro, digite CHAVE_GUARDADA: " keyAck
if [[ "${keyAck}" != "CHAVE_GUARDADA" ]]; then echo "Cadastro cancelado sem criar administrador."; exit 1; fi
export ELO_ADMIN_EMAIL ELO_ADMIN_PASSWORD MFA_ENCRYPTION_KEY
export ELO_BOOTSTRAP_APPROVAL="CRIAR_PRIMEIRA_ADMIN_ELO360_MFA"
echo "Configure o aplicativo autenticador com o segredo que será exibido no terminal."
echo "Guarde também os oito códigos de recuperação offline quando forem apresentados."
node scripts/bootstrap-admin-mfa.js
echo "Fim do assistente inicial. Não compartilhe nenhuma saída contendo segredo."
echo "O serviço de API ainda NÃO estará implantado; testar login exige configuração segura adicional."
