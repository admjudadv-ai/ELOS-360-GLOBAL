# Homologação da autenticação no Render — ELO 360 GLOBAL

## Objetivo e isolamento
Este Blueprint cria somente o serviço web `elo360-auth-staging`, a partir desta branch de homologação. Ele não declara, renomeia nem modifica a API institucional, o site atual ou o PostgreSQL existente.

- Região: Virginia (mesma região dos serviços atuais).
- Runtime: Node.js, diretório raiz `backend/`.
- Build: `npm install --omit=dev`.
- Start: `npm start`.
- Health check: `/health`.
- Deploy automático: desligado para que commits de homologação não publiquem alterações sem ação deliberada.
- Plano: Free, sujeito às limitações e suspensão por inatividade do plano.

## Segredos obrigatórios no serviço novo
Preencher apenas no painel seguro do Render, nunca no Git:
- `DATABASE_URL`: conexão de um PostgreSQL EXCLUSIVO de homologação, sem dados reais. Não usar a URL do banco atual.
- `APP_ORIGIN`: origem HTTPS autorizada para a interface de homologação. Até existir uma interface separada, não apontar para o site público.
- `MFA_ENCRYPTION_KEY`: 64 caracteres hexadecimais (32 bytes), gerada e armazenada em cofre seguro.

`NODE_ENV=production` é configurado para exercitar cookies seguros e HTTPS em homologação. O código exige `DATABASE_URL` e `APP_ORIGIN` para iniciar.

## Bloqueios antes de testar login
1. Provisionar e aprovar um PostgreSQL separado para homologação. Não reutilizar o banco atual.
2. Revisar os scripts SQL e executar as migrações somente nesse banco isolado, após backup/checagem e autorização específica.
3. Revisar RLS, papel SQL de privilégio mínimo e contexto de organização. A migração 003 ainda precisa de validação técnica antes de uso.
4. Criar usuários e organizações exclusivamente fictícios; não importar CPF, CNIS, documentos ou dados reais.
5. Completar o fluxo de inscrição/recuperação MFA, CSRF e testes de rate limiting antes de considerar a autenticação apta.
6. Testar cookies, login, logout, MFA, autorização por organização e logs sem segredos.

## Limites conhecidos do protótipo
- `GET /health` responde `productionReady: false`; saúde do processo não significa prontidão para produção.
- O MFA tem componentes de verificação, mas o fluxo completo de inscrição e recuperação ainda não está integrado.
- A recuperação de conta não está conectada ao fluxo de login.
- Não existe integração do site institucional com este serviço nesta etapa.
- Nenhuma migração é executada pelo build ou pelo start command.

## Regra de promoção
Não conectar o site público, criar o primeiro administrador real, executar migrações no banco atual, ativar deploy automático ou promover para produção sem revisão e autorização expressa separadas.
