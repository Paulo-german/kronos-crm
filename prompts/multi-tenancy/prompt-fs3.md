# 📋 KRONOS CRM: Protocolo de Migração Multi-tenant (SaaS)

> **Contexto:** O projeto atualmente é "Single-player" (tudo atrelado ao `User`). O objetivo é transformar em "Multiplayer" (tudo atrelado à `Organization`), onde usuários são `Members` com permissões específicas.

---

## 🔒 FASE 3: Regras de Negócio & Visibilidade (RBAC)

**Objetivo:** Garantir que "Membro só vê o que é dele", "Admin vê tudo" e "Limites são respeitados".

### 3.1. Data Access Layer (DAL) Refactor

Atualizar **todas** as funções de busca (`getContacts`, `getDeals`, etc) para aplicar o filtro de segurança:

- **Filtro Base:** Sempre incluir `where: { organizationId: ctx.orgId }`.
- **Filtro de Role (MEMBER):**
  - Se `ctx.userRole === 'MEMBER'`, adicionar obrigatoriamente `AND assignedTo: ctx.userId`.
  - _Exceção:_ Se a entidade for pública para a empresa (ex: `Products` ou `Tasks` globais), membros podem ver tudo.

### 3.2. Mutations (Create/Update/Delete)

Nas Server Actions (`createContact`, `updateDeal`, `deleteContact`):

- **Force Assignment (Criação):**
  - Se `MEMBER` estiver criando: O campo `assignedTo` deve ser forçado para `ctx.userId` (ignorar input do front).
  - Se `ADMIN/OWNER` estiver criando: Pode escolher qualquer membro da org no `assignedTo`.
- **Transferência (Update):**
  - Apenas `ADMIN`, `OWNER` ou o próprio `assignedTo` (dono atual) podem alterar a propriedade (`assignedTo`) de um registro.
- **Exclusão (Delete):**
  - Apenas `ADMIN` e `OWNER` podem deletar registros. `MEMBER` nunca deleta (apenas arquiva ou perde o Deal).

### 3.3. Plan Guards (Limites de Cota)

Antes de executar a criação (`createContact`, `createDeal`, `inviteMember`), verificar o plano da organização:

- **Exemplo:** Se `Organization.plan === 'FREE'` e `count(contacts) >= 50`, lançar erro: _"Limite do plano atingido."_
