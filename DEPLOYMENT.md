# ELO 360 GLOBAL — implantação de testes

- Branch separada: implantacao-render-2026-11-12
- Preservar main e os arquivos HTML originais.
- Static site: repositório nesta branch, build `echo static-ready`, publish `.`.
- Web service (Node): mesma branch, build `npm install --omit=dev`, start `npm start`, /health.
- Não incluir CPF, CNIS, prontuários, senhas ou dados reais nesta fase.
- Não registrar `DATABASE_URL` no GitHub. Configurar apenas por segredo no Render quando for autorizado.
- O banco não é migrado automaticamente no deploy.
- Revisar RLS e papéis antes de permitir acesso de usuários finais.
- Banco Render Free atualmente aponta vencimento em 12/12/2026; preparar plano de continuidade.
- Migração após conexão segura e autorização: `ALLOW_MIGRATION=YES npm run db:migrate`.
- API disponível só em /health e /api/status, sem autenticação ou funções de clientes. Outros endpoints retornam 404.
