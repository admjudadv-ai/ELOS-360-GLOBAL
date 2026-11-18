# ELO 360 GLOBAL — Ativação do PostgreSQL atual (plano gratuito)

**Situação confirmada em 13/11/2026:** serviço `elo360-database` está disponível no Render; consulta somente leitura não encontrou tabelas de aplicação. Vencimento informado do banco gratuito: **12/12/2026**.

## Não confundir objetivos
1. Site público institucional pode permanecer no Render Static Site gratuito, sem banco e sem dados pessoais.
2. API de homologação e banco real são componentes separados. Um banco com tabelas não torna o login nem os módulos automaticamente operacionais.
3. Não receba CNIS, CPF, documentos de saúde, contratos, dados financeiros, senhas ou registros reais de clientes antes de a revisão de segurança, permissões, backups e política de continuidade estar concluída.

## O que foi preparado no GitHub (branch de homologação, não implantado)
- `backend/scripts/check-db-readiness.js`: inventário **somente leitura** das oito migrações; não mostra credenciais.
- `backend/scripts/migrate-empty-db.js`: cria a estrutura inicial **apenas se o banco estiver completamente vazio** e se os dois parâmetros explícitos de autorização coincidirem. Não roda em deploy nem no build.
- A ordem de migrações é 001–008 e foi testada no PostgreSQL descartável do GitHub.
- Reexecução da migração inicial em um banco com tabelas é **intencionalmente recusada**, para não afetar registros existentes.

## Procedimento autorizado de implantação (somente em ambiente seguro)
**Não cole sua string de conexão, usuário, senha ou segredo neste chat.**
1. Faça uma revisão atualizada do banco no painel seguro do Render e confirme a identidade do banco `elo360_db`.
2. Antes de executar migrações, obtenha e valide um ponto de recuperação adequado ao ambiente; em banco novo vazio, confirme também ausência de dados ou objetos preexistentes.
3. Em uma máquina/terminal confiável com Node 22+, clone a branch `integracao-auth-segura-2026-11-12`, acesse `backend/` e instale dependências com `npm install`.
4. Configure `DATABASE_URL` **apenas no ambiente do terminal**, usando os dados de conexão do painel Render; nunca grave no repositório, screenshot, documento compartilhado ou comando que vá para histórico do shell.
5. Execute primeiro `node scripts/check-db-readiness.js`. Se aparecer qualquer migração desconhecida, tabela existente ou divergência, interrompa e investigue.
6. Defina no mesmo terminal `ELO_DB_EXPECTED_NAME=elo360_db` e `ELO_DB_MIGRATION_ACK=EU_AUTORIZO_MIGRACAO_INICIAL_ELO360_BANCO_VAZIO`; execute `node scripts/migrate-empty-db.js` somente depois da conferência e consentimento específicos para alterar o banco real.
7. Execute novamente `node scripts/check-db-readiness.js` e confirme oito migrações. Remova as variáveis sensíveis do ambiente de execução quando terminar.

**Atenção:** a conexão externa ao Render pode exigir configuração de rede/SSL no cliente; siga as instruções de conexão fornecidas pelo próprio Render. Não desative TLS para contornar erros.

## O que ainda não estará pronto após a criação das tabelas
- Usuário SQL de privilégios mínimos, acesso a sessões e contexto por organização e revisão de segurança.
- Criação segura e confirmação do primeiro administrador; inscrição MFA real.
- Configuração de `APP_ORIGIN`, `MFA_ENCRYPTION_KEY` e `DATABASE_URL` no serviço API compatível com o backend atual.
- Interfaces completas com CRUD, importação de CNIS, Raio-X, fluxos de ELORA, documentos, finanças e relatórios.
- Backups restauráveis, logs/auditoria, defesa contra abuso, LGPD e operação contínua.

## Restrição de ferramenta desta conversa
O acesso conectado ao banco Render permite **consultas somente leitura**, e não executa `CREATE TABLE` ou migrações. A aplicação dos scripts ao banco real precisa ser feita em ambiente autorizado e confiável. Nenhuma alteração real foi realizada pelo desenvolvimento dos arquivos.

## Continuidade do plano
- Plano gratuito por enquanto; não mudar plano sem autorização.
- Iniciar verificação de migração/upgrade antes da expiração em 12/12/2026.
- Não tratar o banco gratuito como repositório durável de dados pessoais sem backup e plano de recuperação.

## Titularidade administrativa exclusiva
A migração `007_exclusive_owner.sql` cria um registro único `elo.platform_ownership`: **somente uma conta** pode ser proprietária da plataforma. O primeiro cadastro confirmado por MFA cria esse vínculo. A verificação em tempo de requisição considera a titularidade no banco, não uma autodeclaração do navegador. Isso não concede automaticamente acesso a registros de organizações distintas: RLS e autorização por objeto continuam obrigatórias.

A proprietária verá todos os módulos cadastrados, inclusive a área de atendimento. A criação de usuários secundários não pode conceder titularidade universal por endpoints comuns. Transferências futuras precisam de fluxo administrativo separado, com verificação reforçada, aprovação e auditoria. O acesso da titular real **ainda não está ativo no Render**.
