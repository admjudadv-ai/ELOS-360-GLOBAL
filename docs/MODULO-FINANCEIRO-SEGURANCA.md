# ELO 360 Global — contas de recebimento, fundos e investimentos

## Escopo da migração 008 (somente homologação)
Quatro novas tabelas multi-organização: `elo.financial_accounts` (contas bancárias), `elo.financial_funds` (fundos internos), `elo.financial_fund_movements` (lançamentos de fundos) e `elo.financial_investments` (registro de investimentos).

### Contas para recebimento
- Rótulo, nome do banco, país, moeda, tipo de conta e últimos quatro caracteres de identificação.
- Identificador bancário completo **somente cifrado previamente na aplicação com criptografia autenticada**, no campo `encrypted_account_identifier`; nunca salvar número completo, agência, IBAN, PIX sensível ou senha em texto puro.
- O campo cifrado é apenas estrutura de armazenamento: **criptografia e gerenciamento de chaves ainda precisam ser implementados e testados antes da primeira inserção real**.
- Status `draft` é o padrão. Alterar status para `verified` exigirá processo documental e confirmação do titular bancário.

### Fundos e investimentos
- Fundos vinculáveis à conta recebedora da própria organização; movimentações internas com valor positivo, moeda e referência; investimentos com tipo, valor de referência e data de avaliação.
- Investimentos e fundos são **registros administrativos**, não custódia de dinheiro, nem promessa de rentabilidade, nem autorização de transferência ou intermediação.
- Nenhuma integração com PIX, Open Finance, bancos, processadores de pagamento ou corretoras está ativa. Para recebimentos e pagamentos reais, será preciso avaliar integração com prestador habilitado, exigências regulatórias, conciliação, KYC quando aplicável e segregação contábil.

### Proteções implementadas no esquema
- Restrições RLS por organização e `FORCE ROW LEVEL SECURITY` nas quatro tabelas.
- Chaves estrangeiras compostas por organização impedem vínculo de fundo à conta de outra organização, de lançamentos a fundo de terceiro, ou de investimentos a fundo diferente.
- Valores de movimentações exigem sinal positivo; natureza das operações é codificada em campo próprio; moeda tem três letras.
- Privilégios mínimos, autenticação, trilhas imutáveis, validação de valores, conciliação, backups e segurança de acesso aos registros são pendências antes da produção.

## Titularidade universal
A administradora titular, quando provisionada, poderá acessar o módulo Financeiro. Isso **não substitui** o isolamento entre organizações nem dá autorização para terceiros executarem transações.

## Implantação
A migração 008 foi incluída nos scripts iniciais e nos testes de CI com PostgreSQL descartável. O banco Render **não foi modificado** por esses commits.
Antes de importar qualquer conta bancária real: revalidar credenciais, configurar chave de cifra em cofre, revisar o desenho de dados e executar backup/restauração testados.
