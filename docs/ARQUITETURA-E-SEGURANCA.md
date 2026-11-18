# ELO 360 GLOBAL — Arquitetura e segurança

## Situação verificada em 12/11/2026
- `index.html`: página institucional estática.
- `painel.html`: painel de módulos demonstrativo, sem autenticação.
- `previdencia.html`: demonstração local, sem backend, banco, login ou importação real de CNIS.
- `README.md`: apenas o título.
Nenhuma destas páginas deve receber informações reais de clientes.

## Arquitetura proposta (ainda não implantada)
Navegador HTTPS → frontend → API com autenticação/autorização → serviços por módulo → banco de dados relacional e armazenamento privado de documentos.
Módulos ELO 360: Previdência, Jurídico, Saúde, Educação, Empresarial, Financeiro, Network Global, Investidores, Cooperação Internacional e Administração. ELORA deve identificar-se como assistente virtual e agir com supervisão humana. A DMPS é uma plataforma independente.

## Perfis e isolamento
Administrador; Jurídico/Previdência; Saúde; Atendimento/ELORA; Clientes; Parceiros/Investidores.
Aplicar menor privilégio e autorização do lado do servidor em todas as operações, por organização e por registro. Segmentar dados de saúde e documentos sensíveis. Registrar ações administrativas sem revelar segredos ou conteúdo sensível.

## Autenticação e tokens — requisitos
1. Login em servidor HTTPS com proteção contra força bruta e validação de credenciais.
2. Senhas com hash Argon2id, sal individual; nunca guardar senhas em claro.
3. MFA para administradores e usuários privilegiados.
4. Preferir sessão opaca com cookie HttpOnly, Secure, SameSite, prazo curto, revogação e rotação; proteger requisições mutáveis contra CSRF.
5. Caso use JWT: validar assinatura, issuer, audience, algoritmo, expiração e estratégia de revogação.
6. Recuperação de senha: token aleatório de uso único, armazenado como hash, com curta validade.
7. Variáveis secretas em cofre da hospedagem; nunca no GitHub nem no navegador.
8. Usar TLS, criptografia em repouso, backups testados, monitoramento e alertas.

## Fluxo planejado
Login → API valida usuário, senha e segundo fator → cria sessão → navegador recebe cookie seguro → cada requisição valida sessão e autorização → logout revoga a sessão.

## Privacidade
Antes de importar dados pessoais: definir base legal, controlador/operador, finalidade, retenção, contratos, controles de acesso e adequação à LGPD e à legislação aplicável de Moçambique. Documentos de saúde e CNIS requerem precauções reforçadas. Validar transferências internacionais de dados.

## Critérios antes de dados reais
- [ ] Hospedagem, API e banco de dados protegidos
- [ ] Gestão de segredos e backups testados
- [ ] Autenticação, MFA e autorização verificados por testes
- [ ] Repositório e segredos auditados
- [ ] Política de privacidade e contratos aplicáveis
- [ ] Importação testada com dados fictícios
- [ ] Auditoria e resposta a incidentes
- [ ] Aprovação da responsável e revisão profissional

**Este documento é uma especificação técnica, não uma declaração de que a autenticação esteja funcionando.**
