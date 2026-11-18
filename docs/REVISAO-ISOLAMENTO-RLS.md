# Revisão do isolamento de organizações — ELO 360 Global

## Mudança preparada
A migração `db/003_tenant_rls.sql` adiciona políticas RLS para as nove tabelas multi-organização:
`clients`, `cases`, `employment_periods`, `reports`, `documents`,
`projects`, `financial_entries`, `assistant_sessions`, `audit_events`.

- Usa `elo.current_organization_id()` como contexto de uma transação controlada.
- Habilita `FORCE ROW LEVEL SECURITY`, evitando exceção para o proprietário não privilegiado.
- Sem contexto válido, o acesso aos registros deve ser negado.
- Consulta, inserção, alteração e exclusão ficam restritas à organização escolhida.
- Os testes usam PostgreSQL **descartável**, papel `NOSUPERUSER NOBYPASSRLS` e duas organizações fictícias.
- A migração não foi executada no Render e não deve ser aplicada a dados reais sem aprovação adicional.

## Bloqueios para uso real
1. **Identidade/credenciais:** `elo.users`, `elo.roles`, `elo.user_roles`, `elo.auth_sessions` ainda precisam de um modelo de privilégio mínimo e avaliação contra ataques de sessão.
2. **Chaves estrangeiras:** referências a clientes, processos, documentos e projetos deverão validar também o vínculo com a mesma organização, preferencialmente com restrições compostas no banco (RLS não substitui integridade referencial multi-organização).
3. **Contexto confiável:** `elo.organization_id` não pode ser derivado de um parâmetro livre do usuário; deve ser obtido da sessão autenticada e aplicado via transação `SET LOCAL`/ `set_config(..., true)`. Aplicação nunca deve aceitar SQL livre de clientes.
4. **Papel SQL:** usar uma conta sem `SUPERUSER`, `BYPASSRLS` nem propriedade das tabelas, sem acesso global a dados confidenciais. `FORCE RLS` não impede superusuário ou `BYPASSRLS`.
5. **Auditoria:** trilhas de auditoria devem ser preferencialmente somente inserção, com autoria e integridade protegidas, sem `UPDATE`/`DELETE` para usuários normais.
6. **Privacidade e proteção:** implementar criptografia, backups testados, retenção, acesso por documento, logs redigidos e revisão LGPD, especialmente para informações de saúde e previdência.
7. **Ambiente:** banco Render gratuito tem prazo de expiração; planejar continuidade antes de depender dele em produção.

## Critério de homologação
Sem publicação do backend nem migração do banco real enquanto os testes de SQL, permissões, integridade e plano de recuperação não estiverem aprovados.
