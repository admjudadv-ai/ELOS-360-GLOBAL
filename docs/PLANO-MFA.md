# ELO 360 Global — MFA em homologação (não ativado)
Este documento descreve o primeiro componente técnico de autenticação em duas etapas (TOTP) incluído na PR nº 5.

## O que foi implementado
- Biblioteca independente `backend/mfa.js`, sem rotas públicas, sem interface de inscrição nem armazenamento de segredo.
- Geração de segredo aleatório de 160 bits (Base32).
- Cálculo TOTP de seis dígitos com passo de 30 segundos; verificação com janela configurável máxima de um passo.
- Comparação dos códigos usando `timingSafeEqual`, e retorno do contador para impedir a reutilização quando persistido atomicamente.
- Cifragem dos segredos com AES-256-GCM e associação ao identificador do usuário (AAD).
- Testes automatizados com vetor do padrão RFC 6238, relógio, repetição, formato, troca de usuário e troca de chave.

## Proteções exigidas antes de habilitar MFA real
1. Registro do fator em transação e confirmação TOTP com desafio temporário; **nunca aceitar o fator não confirmado**.
2. Guardar a chave de cifragem em cofre de segredos do provedor, com rotação planejada. Nunca inserir a chave em GitHub, logs ou mensagens.
3. Persistir `last_accepted_counter` com `UPDATE` condicional **atômico** para barrar reutilização em requisições concorrentes.
4. Login com senha só pode criar uma sessão **pré-MFA**, sem acesso a dados, e uma sessão completa apenas após confirmação do segundo fator.
5. Aplicar rate limit por conta e IP, bloquear tentativas abusivas e auditar eventos sem gravar senha, token ou segredo.
6. Elaborar recuperação de conta mediante códigos de recuperação gerados aleatoriamente, **armazenados somente com hash**, de uso único, e procedimento com aprovação humana.
7. Implementar renovação/remoção do fator com reautenticação e revisão do risco de sequestro de conta.
8. Testar phishing, travessia de domínios, perda de dispositivo, rotatividade de chaves, disponibilidade, acessibilidade e privacidade.

## Limitações e decisões
- TOTP é uma segunda etapa comum, mas **não é resistente a phishing em tempo real**. Para contas de alta criticidade, planejar passkeys/WebAuthn como alternativa preferencial.
- **Nenhuma conta recebeu MFA ainda.** O backend existente não importa nem utiliza a biblioteca.
- Nenhum segredo foi salvo no banco real.
- Para autenticação pública e dados reais, ainda são obrigatórias revisão de segurança independente e validação em HTTPS.

## Preparação de recuperação com código único (etapa adicional)
- `backend/recovery.js` gera oito códigos aleatórios de 128 bits cada, com validação estrita; a quantidade pode ser ajustada em homologação.
- Os códigos apresentados **uma única vez** ao usuário não devem ser registrados em logs, analytics, e-mails ou bancos de dados em texto puro.
- `db/005_mfa_recovery.sql` prevê somente hashes associados ao usuário e à organização, com política RLS e chave estrangeira composta.
- Em teste, a utilização é um `DELETE ... RETURNING` transacional: após o primeiro uso, o código deixa de existir e as tentativas seguintes falham. O teste também bloqueia outra organização e outro usuário.
- **O módulo de recuperação ainda não está conectado ao login público e não permite contornar MFA.** A recuperação de conta completa exige confirmação da identidade e procedimento de risco revisado, limite de tentativas, aviso de eventos, revogação de sessões e auditoria antes da ativação.
- O teste CI não cria usuário nem migra o banco real.

## Autenticação em duas etapas conectada ao backend de homologação (etapa 2026-11-13)
- `db/006_mfa_challenge.sql`: armazena metadados do fator TOTP e desafios temporários com expiração de cinco minutos; não aplicado no Render.
- `POST /api/auth/login`: se o fator estiver habilitado, uma senha válida devolve `202 {mfaRequired:true}`, cookie HTTP-only de desafio e **nenhuma sessão completa**.
- `POST /api/auth/mfa/verify`: valida código temporário, limita tentativas, exige desafio válido, persiste contador aceito e só então emite sessão completa. Desafios são eliminados após uso.
- A tela `backend/views/login.html` e o script `login.js` apresentam a etapa adicional no mesmo domínio do backend.
- `backend/test/mfa-flow.test.js` testa acesso negado sem MFA, desafio pendente, código errado, liberação com código correto e bloqueio de reutilização, usando PostgreSQL descartável.

### Cuidados ainda obrigatórios
- Este caminho MFA de homologação depende do esquema 006 e de `MFA_ENCRYPTION_KEY` num cofre seguro. Não configurar nem distribuir chaves aqui.
- A API ainda precisa de **inscrição e confirmação do segundo fator**, revogação de sessões antigas ao ativar MFA, recuperação operacional com revisão humana, redução de vazamento de metadados, monitoramento e testes de concorrência.
- Os controles de permissões SQL, riscos de configuração do papel de banco e a API de dados real ainda exigem revisão.
- Para contas de maior risco, autenticação resistente a phishing (passkeys/WebAuthn) continua sendo uma meta.
- MFA e recuperação de conta permanecem **não implantados publicamente**. Não realizar deploy da API a partir desta PR sem homologação completa.
