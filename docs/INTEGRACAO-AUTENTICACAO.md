# Integração controlada da autenticação (PR #3)

**Somente protótipo, não preparado para dados reais.** A branch `main` e o serviço Render não são alterados por esta integração.

## Compatibilidade
- A PR #3 usa tabelas independentes `auth_*` e um backend Express. O projeto implantado usa `elo.*` e uma API Node demonstrativa.
- Este protótipo de autenticação foi adaptado para `elo.users`, `elo.roles`, `elo.user_roles`, `elo.auth_sessions` e preserva o serviço atual em `api/server.js`.
- Executar `db/001_initial.sql` antes de `db/002_auth_sessions.sql`; **nenhuma das duas migrações foi executada**.
- O comando `npm start` da raiz continua iniciando apenas a API demonstrativa. A autenticação é outro processo de teste, não está online.
- Configurar `DATABASE_URL` e `APP_ORIGIN` apenas em armazenamento seguro na hospedagem, não em arquivos públicos.

## Pendências para homologação
1. Executar testes de autenticação com banco descartável e dados fictícios.
2. Implementar MFA, controle de autorização por registro, testes de rate limit e proteção contra CSRF.
3. Corrigir publicação estática do diretório raiz, pois expõe backend e SQL se for republicado.
4. Revisar permissões no PostgreSQL, RLS, política de armazenamento, backups e LGPD.
5. Não inserir CPF, CNIS ou dados pessoais no ambiente atual.
