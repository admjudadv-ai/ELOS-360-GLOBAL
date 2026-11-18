# ELO 360 GLOBAL — primeiro acesso administrativo seguro

**Situação:** preparado em homologação; a conta real ainda NÃO foi criada. O PostgreSQL do Render estava vazio na última consulta. Não usar CPF, CNIS, documentos, dados médicos ou dados de clientes durante os testes.

## Pré-requisitos obrigatórios
1. Conferir e inicializar o banco conforme `docs/ATIVACAO-BANCO-RENDER.md`, com procedimento explícito, backup e autorização separados.
2. Usar Node 22+ e dependências instaladas em `backend/` em um terminal pessoal confiável. Não executar scripts de criação administrativa durante build ou deploy.
3. Proteger os parâmetros `DATABASE_URL`, `ELO_ADMIN_EMAIL`, `ELO_ADMIN_PASSWORD` e `MFA_ENCRYPTION_KEY` em variáveis de ambiente definidas por mecanismo seguro; NÃO gravá-los em arquivos no repositório, capturas de tela, históricos de shell, e-mails ou nesta conversa.
4. A senha inicial deve ser única e forte, com no mínimo 16 caracteres. A chave MFA é um segredo aleatório de 32 bytes codificado em hexadecimal (64 caracteres) e deve permanecer disponível de forma durável num cofre seguro. Perdê-la pode impossibilitar a leitura dos segredos MFA criptografados.

## Provisionamento inicial
No ambiente seguro, após as migrações 001–007, configure:
- `ELO_DB_EXPECTED_NAME` = nome exato do banco
- `ELO_BOOTSTRAP_APPROVAL` = `CRIAR_PRIMEIRA_ADMIN_ELO360_MFA`
- as quatro variáveis protegidas citadas acima

Execute `node scripts/bootstrap-admin-mfa.js` na pasta `backend/`, com terminal interativo. O programa recusa ambientes sem migrações, com administrador ou usuários preexistentes, com nome de banco diferente, senha curta, chave inválida ou MFA não confirmado.

O aplicativo autenticador do administrador deverá receber o segredo exibido **somente em ambiente privado**. Digite no próprio terminal o código de seis dígitos gerado para confirmar o fator antes da criação definitiva da conta. O programa exibirá o identificador da organização e oito códigos de recuperação **uma única vez**, para armazenamento offline seguro. NÃO repasse esses códigos ao ChatGPT nem os guarde junto com a senha.

## Testes de aceite antes da liberação
- Login de conta administrativa com senha correta deve responder com desafio MFA pendente (`202`), sem sessão completa.
- Conta sem segundo fator confirmado não pode abrir `/admin`, `/api/admin/check` nem os dados.
- Código incorreto é rejeitado, contador não pode ser reutilizado e tentativa fora da janela expira.
- Ao confirmar código correto, a sessão autenticada só pode ver a organização e os módulos autorizados.
- Logout, bloqueio de conta, expiração da sessão, HTTPS e cookies seguros verificados.
- Dados reais só poderão ser tratados após revisão de RLS, segurança por objeto, integridade, auditoria, backup restaurável, continuidade do banco e LGPD.

## Compatibilidade de hospedagem
O serviço Render `elo360-global-api` existente ainda aponta para o backend de `main`; **não trocar sua branch/start command automaticamente**. O backend de autenticação preparado está em `backend/` na PR nº 5 (não mesclada); é preciso planejar e homologar a implantação da API de autenticação com `APP_ORIGIN` definido pelo domínio HTTPS final. Não colocar `MFA_ENCRYPTION_KEY` ou `DATABASE_URL` em commits.

## Plano gratuito
O banco Render gratuito tem expiração informada para 12/12/2026. Não confiar nesse prazo como garantia de disponibilidade durável; antes de usar dados reais, preparar migração e backup testado. Não mudar de plano nem contratar recursos sem autorização.

## Titularidade administrativa exclusiva
A migração `007_exclusive_owner.sql` cria um registro único `elo.platform_ownership`: **somente uma conta** pode ser proprietária da plataforma. O primeiro cadastro confirmado por MFA cria esse vínculo. A verificação em tempo de requisição considera a titularidade no banco, não uma autodeclaração do navegador. Isso não concede automaticamente acesso a registros de organizações distintas: RLS e autorização por objeto continuam obrigatórias.

A proprietária verá todos os módulos cadastrados, inclusive a área de atendimento. A criação de usuários secundários não pode conceder titularidade universal por endpoints comuns. Transferências futuras precisam de fluxo administrativo separado, com verificação reforçada, aprovação e auditoria. O acesso da titular real **ainda não está ativo no Render**.
