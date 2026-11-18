# ELO 360 GLOBAL — Preparação para banco de dados extenso

**Não enviar dados de clientes, CPF, CNIS reais, prontuários ou senhas ao repositório.** Primeiro precisamos implantar o serviço de autenticação, armazenamento protegido e controles legais.

## Etapas
1. Inventariar fontes (sistemas de origem, tabelas, arquivos e APIs), formatos, volume e qualidade.
2. Classificar por módulo: Previdência, Jurídico, Saúde, Educação, Empresarial, Financeiro, Network, Investidores, Cooperação.
3. Definir titularidade, base legal, finalidade e acessos por perfil, especialmente dados sensíveis.
4. Criar modelo relacional com identificadores internos, chaves, índices, rastreabilidade e trilhas de auditoria.
5. Validar migração com exemplos inteiramente fictícios e ambiente de homologação.
6. Fazer importação em lotes por canal criptografado, com prevenção de duplicatas, logs sem dados sensíveis e possibilidade de reversão.
7. Conciliar registros de origem e destino; testar restauração e acessos antes de disponibilizar.

## Inventário inicial, sem dados pessoais
| dataset | origem | módulo | formato | registros_aprox | tamanho_aprox | classe_dados | país | responsável |
|---|---|---|---|---|---|---|---|---|

## Previdência
Modelar vínculos, competências, contribuições, remunerações, indicadores, pendências e anexos, mantendo a origem dos dados e revisão por profissional habilitado. A leitura automática de CNIS e Raio-X efetivo ainda dependem de serviços de processamento não implementados.

## Condições de início da importação
Definir provedor de hospedagem, banco, canal seguro de entrega e permissões. Não compartilhar credenciais no chat nem no GitHub.
