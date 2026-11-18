# ELO 360 Global — autenticação inicial

**Protótipo para homologação, NÃO disponível ao público, NÃO pronto para dados reais.**

## Rotas
- `GET /health`: servidor ativo (não verifica banco)
- `POST /api/auth/login`: recebe `organizationId`, `email` e `password`, exige cabeçalho `Origin` igual a `APP_ORIGIN`, retorna cookie de sessão HttpOnly
- `GET /api/auth/me`: identifica sessão e papéis
- `GET /api/admin/check`: verifica papel admin
- `POST /api/auth/logout`: revoga sessão

Senhas são verificadas com Argon2id; tokens aleatórios de 32 bytes são armazenados somente como hash SHA-256 no PostgreSQL. Cookies em produção exigem HTTPS e usam `Secure`, `HttpOnly` e `SameSite=Strict`.

## Configuração
1. Hospedar Node.js 20+ e PostgreSQL privado; executar `schema.sql`.
2. Configurar `DATABASE_URL`, `APP_ORIGIN`, `NODE_ENV=production` e segredos no provedor de hospedagem, nunca no Git.
3. `npm install`, `npm run check`, `npm start`.
4. Provisionar usuário administrativo por procedimento protegido, com hash Argon2id; **não inserir senha em SQL, GitHub ou chat**.
5. Fazer testes integrados de login, logout, sessão expirada, acesso negado, rate limit e origens inválidas.

## Bloqueios antes de produção
MFA, criação de contas, recuperação de acesso, proteção operacional contra brute force distribuído, auditoria, CI, testes, autorização por registro, banco e backups, infraestrutura HTTPS, documentação LGPD e revisão de segurança. Não conectar `previdencia.html` diretamente a este protótipo; ela é uma demonstração sem dados reais.
