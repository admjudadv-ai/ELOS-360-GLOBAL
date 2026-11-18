# ELO 360 Global — plano de homologação do acesso protegido

## Implementado somente na branch de testes
- Backend Express em `backend/server.js` com `GET /login`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /admin`, `GET /api/admin/check` e `POST /api/auth/logout`.
- `GET /admin` exige sessão ativa e papel `admin` **verificado no servidor**.
- HTML/CSS/JS de login e administração mantidos em `backend/views`; **não publicados** no site estático público.
- Dados reais, CPF, CNIS e prontuários estão proibidos no ambiente demonstrativo.
- Testes de banco integram as migrações 001/002 em PostgreSQL temporário no GitHub Actions; não executam migrations no Render.

## Antes de ativar o login em um domínio público
1. Revisar autorização por registro e organização em TODOS os endpoints, com políticas RLS e usuário SQL de privilégio mínimo (o esquema inicial ainda não está adequado a dados reais).
2. Implementar MFA, provisionamento seguro de usuários e recuperação de conta, além de antifraude e rate limiting distribuído.
3. Definir estratégia confiável de atualização de sessão, auditoria e revogação global. Validar CSRF e cabeçalhos de origem com o domínio HTTPS definitivo.
4. Definir variáveis `DATABASE_URL` e `APP_ORIGIN` apenas no painel seguro da hospedagem, nunca no GitHub ou em mensagens; não copiar senhas em logs.
5. Revisar backup, retenção, exclusão e LGPD, especialmente dados de saúde e previdenciários.
6. Executar as migrações apenas com autorização específica, plano de rollback e backup; banco gratuito possui validade limitada.
7. Usar deploy separado do site público, ou migração arquitetural revisada. Não trocar o `npm start` da API pública existente sem homologação.
8. Testar via HTTPS a página de login, cookies Secure/HttpOnly/SameSite, permissões administrativas, sessões e negações, somente com contas fictícias.

## Estado de produção
- Site público atual: `elo360-global-site` no Render; estático, publicado da allowlist `public-dist`.
- API pública atual: `elo360-global-api`; não serve login real.
- Esta PR é um rascunho, não deve ser mesclada à `main` sem revisão.
- Nenhum mecanismo de autenticação desta branch está ativo publicamente.
