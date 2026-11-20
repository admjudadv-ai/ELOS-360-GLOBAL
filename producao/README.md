# Elos 360° Global — servidor de produção

Responsável: Coordenadora Patrícia Santos Pereira.

Sistema integrado e plataforma Elos 360° Global num servidor próprio: banco PostgreSQL, login seguro, tempo real e todas as telas do sistema (setores, módulos de gestão, programas, Eventos Globais, Futuros Clientes).

## Como funciona

- `server.js`: servidor Node (Express) com banco PostgreSQL.
- `public/`: as telas do sistema Elos, ligadas ao servidor por `elos-shim.js`.
- `build.py`: gera `public/` a partir das páginas do sistema integrado.
- `seed.json`: dados iniciais (5 projetos globais do Futuro Sem Fronteiras), carregados só com o banco vazio.
- `test.js`: teste de segurança e permissões (`npm test`, com o servidor rodando).

## Segurança

- Senhas com Argon2id; sessão em cookie assinado, HttpOnly, SameSite=Lax, Secure em HTTPS.
- Escritas exigem o cabeçalho `X-Elos` (proteção contra CSRF).
- Limite de tentativas no login e no cadastro.
- Regras por coleção: dados internos (financeiro, contratos, RH, tributário, projetos, tarefas, conversas) só para a equipe liberada; visitantes veem Eventos Globais; futuros clientes enviam e veem só o próprio interesse.
- A coordenadora (e-mails em `OWNER_EMAILS`) tem acesso total. Novas contas entram como pendentes; a coordenação libera os setores na tela Logins e Acessos.
- Cabeçalhos: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy.
- Registro de auditoria em `elos_audit` (cadastros, logins e escritas).

## Variáveis de ambiente (Render)

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | Internal Database URL do banco `elo360-database` |
| `SESSION_SECRET` | segredo aleatório de 48+ caracteres (gerado pelo Render) |
| `OWNER_EMAILS` | e-mail(s) da coordenação, separados por vírgula |
| `ANTHROPIC_API_KEY` | opcional: liga a inteligência artificial |

Nunca grave essas variáveis no GitHub.

## Render

- Root Directory: `producao`
- Build: `npm install --omit=dev`
- Start: `npm start`
- Health check: `/health`
