# Elos 360° Global · Dossiê completo do projeto

**Responsável:** Coordenadora PSP
**Atualizado em:** 21/11/2026
**Pasta oficial deste registro:** repositório `admjudadv-ai/ELOS-360-GLOBAL`, ramo `producao-elos360`, pasta `documentacao/`

---

## 1. Identificação

| Item | Situação |
| --- | --- |
| Nome | Elos 360° Global |
| Site público | https://elo360global.com.br |
| Sistema integrado | https://elo360global.com.br/sistema |
| Convite | https://elo360global.com.br/convite |
| Privacidade e termos | https://elo360global.com.br/privacidade · https://elo360global.com.br/termos |
| E-mail oficial | contato@elos360global.com.br |
| Domínio | elo360global.com.br (Registro.br), com HTTPS; o endereço com www redireciona para ele |
| Endereço técnico do servidor | https://elos360-global.onrender.com |

## 2. Linha do tempo

| Data | O que aconteceu |
| --- | --- |
| 12/11/2026 | Primeiros serviços no Render (site, API e autenticação de homologação), hoje suspensos |
| 18/11/2026 | Repositório do projeto criado no GitHub |
| 19/11/2026 | Diagnóstico técnico com pendências de P0 a P2 |
| 20/11/2026 | Servidor de produção único: PostgreSQL, login seguro, regras de acesso e tempo real |
| 20/11/2026 | Banco pago (Basic 256 MB) e serviço no plano Starter; acesso externo ao banco fechado |
| 20/11/2026 | Domínio elo360global.com.br ligado com HTTPS |
| 20/11/2026 | Inteligência artificial ligada (chave colocada pela própria coordenação) |
| 20/11/2026 | Tributos e previdência de 226 países em todas as janelas |
| 20/11/2026 | PDFs: quanto vale o projeto, memorando, nota de imprensa, histórico e apontamentos |
| 20/11/2026 | Janela de rastreamento para transportadoras com o parceiro Sinal |
| 20/11/2026 | Página inicial com caminhos rápidos, busca e mapa do sistema |
| 20/11/2026 | Congressos médicos no mundo, terras raras no Brasil, câmbio e bolsas, dificuldades sociais, mulheres africanas e mercúrio |
| 20/11/2026 | Terras raras na África, festas e eventos, engenharia, energia, operações bancárias, cobrança, documentos com senha, convite e aplicativo instalável |
| 20/11/2026 | Aplicativos nativos Android e iOS compilados no GitHub; política de privacidade e termos |
| 21/11/2026 | Previdência e trabalho, raio-X dos países, comandos rápidos, painel de TI, tamanhos responsivos, convite novo e nome abreviado PSP |

## 3. Infraestrutura

| Peça | Detalhe |
| --- | --- |
| Código | GitHub `admjudadv-ai/ELOS-360-GLOBAL`, ramo `producao-elos360` |
| Servidor | Render, serviço `elos360-global` (Node.js, plano Starter, região Virgínia, EUA) |
| Banco de dados | Render PostgreSQL `elo360-database`, plano Basic 256 MB, sem acesso externo |
| Publicação | A cada envio ao GitHub, disparar um novo deploy no Render (a publicação automática nem sempre dispara) |
| Domínio e DNS | Registro.br, apontado para o Render |
| Aplicativos | Compilação automática no GitHub (`.github/workflows/apps.yml`); resultados no ramo `apps-build` |
| Serviços antigos | `elo360-global-site`, `elo360-global-api`, dois serviços de autenticação de homologação e o pgAdmin estão suspensos, sem custo de execução |
| Banco de teste | `elo360-auth-staging-db` aguarda autorização para exclusão definitiva |

Arquivos principais: `producao/server.js` (servidor e regras), `producao/public/index.html` (sistema), `producao/public/site.html` (site), `producao/public/paises-fiscal.json` (tributos de 226 países), `apps/android` e `apps/ios` (aplicativos).

## 4. Segurança e privacidade

- Senhas cifradas com Argon2id; sessão em cookie protegido.
- Toda gravação exige o cabeçalho de segurança da plataforma, contra envio entre sites.
- Política de segurança de conteúdo: a página só conversa com o próprio servidor.
- Níveis de acesso: visitante, cadastrado, equipe ativa, administração e proprietária (Coordenadora PSP, acesso total).
- Cada cliente vê só os próprios pedidos, atendimentos e cadastros; a coordenação vê as filas inteiras.
- Comissões e contatos de parceiros ficam restritos à coordenação.
- Operações bancárias e cobrança visíveis só para Diretoria, Financeiro e administração.
- Política de privacidade (LGPD e GDPR) e termos de uso publicados.

## 5. Janelas do sistema

| Grupo | Janelas |
| --- | --- |
| Entrada | Página inicial com banner clicável, caminhos rápidos, aviso do aplicativo, mapa do sistema (🧭), comandos rápidos (⌘ / Ctrl+K), cadastro por interesse |
| Países | Raio-X dos países (economia, setores público e privado, botão de interação), Países, Tributos e previdência de 226 países |
| Financeiro | Operações bancárias mundiais, gestão de cobrança mundial, câmbio de 166 moedas e bolsas, Financeiro (contas a pagar e a receber), Tributário e Fiscal |
| Mineração | Programa Global de Mineração, Terras raras no Brasil, Terras raras na África (54 países), Cadeia de Recursos |
| Serviços | Rastreamento para transportadoras (parceiro Sinal), Festas e eventos, Engenharia civil e construção, Energia sustentável, Regularização de documentos, Previdência e trabalho |
| Eventos | Eventos Globais, Congressos médicos no mundo (1.131, 46 especialidades, 68 países, nov/2026 a dez/2027) |
| Social | Dificuldades do mundo por continente e voluntariado (217 países), Elos Social, African Women Power 2030, Mulheres africanas e o mercúrio (plano por país) |
| Rede | Network Global, Projetos (em andamento e novos), Comunidade, Oportunidades, Setores e áreas profissionais |
| Gestão | Painel 360, Central Integrada, módulos ERP, Acessos, Futuros clientes, Painel de TI |
| Divulgação | Convite para clientes (WhatsApp e e-mail), Aplicativo (instalação) |

**Atendimento com senha:** festas, engenharia, energia, documentos, previdência e interações com países geram senha por ordem de chamada (ex.: DOC-0001), com especialista responsável e conversa dentro da plataforma.

## 6. Módulos ERP

Operações bancárias mundiais · Gestão de cobrança mundial · Financeiro · Contratos · Fornecedores · Contatos do Network · Pessoas e RH · Compras e Estoque · Jurídico e Compliance · Documentos · Tributário e Fiscal (alíquota automática por país) · Cadeia de Recursos · Logística e Comércio · Eventos Sociais (100% voluntariado) · Ativos e Manutenção.

## 7. Dados atualizados automaticamente

| Dado | Atualização | Origem |
| --- | --- | --- |
| Congressos médicos | Diária | Calendário público mundial de congressos médicos |
| Câmbio de 166 moedas | Diária | Serviço público de cotações de referência |
| Bolsas e commodities (30) | A cada 20 minutos | Cotações públicas de mercado |
| Indicadores dos países | Diária | Banco Mundial (pobreza, fome, água, energia, saúde, escola, emprego, PIB, setores, comércio, energia renovável) |
| Tributos e previdência | Base de referência | Arquivo próprio de 226 países |

Terras raras (Brasil e África), acordos de previdência e links oficiais foram pesquisados em 20/11/2026 e precisam de revisão periódica.

## 8. Aplicativos

| Plataforma | Situação |
| --- | --- |
| Site instalável | No ar: iPhone (Safari › Compartilhar › Adicionar à Tela de Início), Android (Chrome › Instalar aplicativo) e computador |
| Android | Pacote `br.com.elo360global.app`, versão 1.0.0, assinado para a Google Play; APK de teste disponível |
| iOS | Projeto Xcode compila sem erros; falta a conta Apple Developer para assinar e enviar |

A chave de assinatura do Android e a senha foram entregues à Coordenadora PSP e **não ficam no repositório**. Impressão digital SHA-256 da chave de envio: `2F:5E:16:28:44:1B:D9:90:FE:EC:41:17:19:33:FB:A4:A1:4F:90:CC:82:88:F3:87:D0:53:B0:84:63:9F:5F:0E`. A verificação do domínio já está publicada em `/.well-known/assetlinks.json`.

## 9. Documentos e materiais

| Material | Onde está |
| --- | --- |
| Quanto vale o projeto · Memorando · Nota de imprensa · Histórico e apontamentos | `documentacao/pdf/` |
| Briefing para parceiros, investidores e fornecedores | https://claude.ai/artifact/WSmKPS2z6MaFKjy4uY67Xi |
| Convites (celular e e-mail) | `documentacao/imagens/` e no site |
| Imagens das lojas (destaque e ícones) | `documentacao/imagens/` |
| Política de privacidade e termos | No site |

## 10. Parceiro em destaque

**Sinal Rastreadores:** instalação e desinstalação de equipamentos de rastreamento para transportadoras em todo o Brasil. Regras: contratação concluída dentro da plataforma, vínculo mínimo de 6 meses com a Elos, comissão registrada e acesso aos contatos restrito à coordenação.

## 11. Pendências e próximos passos

| Pendência | Quem faz |
| --- | --- |
| Criar conta na Google Play Console e enviar o pacote Android | Coordenadora PSP (conta e taxa) |
| Enviar a impressão digital da Google Play para ligar o app ao domínio | Coordenadora PSP envia, Claude aplica |
| Entrar no Apple Developer Program para publicar no iPhone | Coordenadora PSP (assinatura anual) |
| Capturas de tela do celular para as lojas | Coordenadora PSP |
| Nomes dos especialistas por operação (janela Documentos) | Coordenadora PSP |
| Recuperação de senha, verificação em duas etapas e e-mails automáticos | Claude |
| Autorizar a exclusão do banco de teste (`elo360-auth-staging-db`) | Coordenadora PSP |
| Conferir a validade da chave de inteligência artificial | Coordenadora PSP |
| Percentuais de comissão e contrato escrito de intermediação | Coordenadora PSP |
| Revisão periódica de terras raras, acordos e links oficiais | Claude |

**Atenção:** existe um script (`producao/build.py`) usado por outra sessão que reconstrói o arquivo do sistema a partir de outro arquivo. Se for executado sem as janelas novas, elas podem sumir. Antes de usá-lo, conferir este dossiê.

## 12. Como manter

- **Painel de TI** (`#ti`): servidor, banco, versão publicada, fontes de dados e limpeza da cópia do aplicativo.
- **Comandos rápidos:** Ctrl+K, ⌘K ou a tecla / abrem a busca; palavras como "passaporte", "dólar", "INSS" ou o nome de um país levam à janela certa.
- **Publicar uma mudança:** enviar ao ramo `producao-elos360` e disparar o deploy do serviço `elos360-global` no Render.
- **Aplicativos:** qualquer mudança em `apps/` recompila Android e iOS no GitHub; o resultado aparece no ramo `apps-build`.
