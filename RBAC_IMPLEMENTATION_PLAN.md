# Plano de Implementação: Fase 3 - RBAC & Visibilidade

> **Objetivo:** Garantir que "Membro só vê o que é dele", "Admin vê tudo" e "Limites são respeitados".

---

## Regras Gerais

- Após executar as mudaças necessário faça uma verificação para ter cereteza que não tem erros de typescript e ESLint.
- Mantenha o padrão de código e estrutura atual do projeto (não despadronize).

---

## Status de Implementação

### Etapa 1: Infraestrutura RBAC ✅

- [x] 1.1 Criar `app/_lib/rbac/types.ts`
- [x] 1.2 Criar `app/_lib/rbac/permissions.ts`
- [x] 1.3 Criar `app/_lib/rbac/guards.ts`
- [x] 1.4 Criar `app/_lib/rbac/plan-limits.ts`
- [x] 1.5 Criar `app/_lib/rbac/index.ts`

### Etapa 2: Data Access Layer ✅

- [x] 2.1 Refatorar `get-contacts.ts`
- [x] 2.2 Refatorar `get-contact-by-id.ts`
- [x] 2.3 **FIX CRÍTICO:** `get-deals-by-pipeline.ts` (adicionar orgId)
- [x] 2.4 Refatorar `get-deal-details.ts`
- [x] 2.5 Refatorar `get-deals-options.ts`
- [x] 2.6 Refatorar `get-tasks.ts`
- [x] 2.7 Refatorar `global-search.ts`

### Etapa 3: Actions - Contacts ✅

- [x] 3.1 `createContact` - permissão + quota + assignedTo
- [x] 3.2 `updateContact` - acesso + transferência
- [x] 3.3 `deleteContact` - apenas ADMIN+
- [x] 3.4 `bulkDeleteContacts` - apenas ADMIN+

### Etapa 4: Actions - Deals ✅

- [x] 4.1 `createDeal` - quota
- [x] 4.2 `updateDeal` - acesso + transferência
- [x] 4.3 `deleteDeal` - apenas ADMIN+
- [x] 4.4 `moveDealToStage` - acesso
- [x] 4.5 `markDealWon` - acesso
- [x] 4.6 `markDealLost` - acesso
- [x] 4.7 `reopenDeal` - acesso
- [x] 4.8 `updateDealPriority` - acesso
- [x] 4.9 `addDealProduct` - acesso
- [x] 4.10 `removeDealProduct` - acesso
- [x] 4.11 `addDealContact` - acesso
- [x] 4.12 `removeDealContact` - acesso
- [x] 4.13 `updateDealContact` - acesso
- [x] 4.14 `createActivity` - acesso ao deal
- [x] 4.15 `createTask` (deal) - acesso ao deal
- [x] 4.16 `toggleTask` - acesso ao deal

### Etapa 5: Actions - Tasks ✅

- [x] 5.1 `createTask` - quota + assignedTo
- [x] 5.2 `updateTask` - acesso + transferência
- [x] 5.3 `deleteTask` - MEMBER pode deletar próprias
- [x] 5.4 `toggleTaskStatus` - acesso
- [x] 5.5 `bulkDeleteTasks` - acesso por item

### Etapa 6: Actions - Products ✅

- [x] 6.1 `createProduct` - ADMIN+ + quota
- [x] 6.2 `updateProduct` - ADMIN+
- [x] 6.3 `deleteProduct` - ADMIN+
- [x] 6.4 `bulkDeleteProducts` - ADMIN+

### Etapa 7: Actions - Pipeline ✅

- [x] 7.1 `createStage` - ADMIN+
- [x] 7.2 `updateStage` - ADMIN+
- [x] 7.3 `deleteStage` - ADMIN+
- [x] 7.4 `deleteStageWithMigration` - ADMIN+
- [x] 7.5 `reorderStages` - ADMIN+

### Etapa 8: Páginas ✅

- [x] 8.1 Atualizar página de contacts
- [x] 8.2 Atualizar página de pipeline
- [x] 8.3 Atualizar página de tasks
- [x] 8.4 Atualizar página de products (sem filtro - global na org)
- [x] 8.5 Atualizar busca global

---

## Detalhamento das Etapas

### Etapa 1: Infraestrutura RBAC

Criar módulo `app/_lib/rbac/` com a seguinte estrutura:

#### 1.1 `types.ts`

```typescript
import type { MemberRole } from '@prisma/client'

export type RBACEntity = 'contact' | 'deal' | 'task' | 'product' | 'pipeline'
export type RBACAction = 'create' | 'read' | 'update' | 'delete' | 'transfer'

export interface PermissionContext {
  userId: string
  orgId: string
  userRole: MemberRole
}

export interface EntityOwnership {
  assignedTo: string | null
  organizationId: string
}

export interface PermissionResult {
  allowed: boolean
  reason?: string
}

export interface PlanLimits {
  contacts: number
  deals: number
  members: number
  products: number
}
```

#### 1.2 `permissions.ts`

```typescript
import type { MemberRole } from '@prisma/client'
import type { RBACEntity, RBACAction, PlanLimits } from './types'

export const PERMISSION_MATRIX: Record<
  RBACEntity,
  Record<RBACAction, MemberRole[]>
> = {
  contact: {
    create: ['OWNER', 'ADMIN', 'MEMBER'],
    read: ['OWNER', 'ADMIN', 'MEMBER'],
    update: ['OWNER', 'ADMIN', 'MEMBER'],
    delete: ['OWNER', 'ADMIN'],
    transfer: ['OWNER', 'ADMIN'],
  },
  deal: {
    create: ['OWNER', 'ADMIN', 'MEMBER'],
    read: ['OWNER', 'ADMIN', 'MEMBER'],
    update: ['OWNER', 'ADMIN', 'MEMBER'],
    delete: ['OWNER', 'ADMIN'],
    transfer: ['OWNER', 'ADMIN'],
  },
  task: {
    create: ['OWNER', 'ADMIN', 'MEMBER'],
    read: ['OWNER', 'ADMIN', 'MEMBER'],
    update: ['OWNER', 'ADMIN', 'MEMBER'],
    delete: ['OWNER', 'ADMIN', 'MEMBER'],
    transfer: ['OWNER', 'ADMIN'],
  },
  product: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
  pipeline: {
    create: ['OWNER', 'ADMIN'],
    read: ['OWNER', 'ADMIN', 'MEMBER'],
    update: ['OWNER', 'ADMIN'],
    delete: ['OWNER', 'ADMIN'],
    transfer: [],
  },
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: { contacts: 50, deals: 25, members: 2, products: 10 },
  PRO: { contacts: 1000, deals: 500, members: 10, products: 100 },
  ENTERPRISE: { contacts: -1, deals: -1, members: -1, products: -1 },
}

export function hasPermission(
  role: MemberRole,
  entity: RBACEntity,
  action: RBACAction,
): boolean {
  return PERMISSION_MATRIX[entity][action].includes(role)
}

export function isElevated(role: MemberRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}
```

#### 1.3 `guards.ts`

```typescript
import type { MemberRole } from '@prisma/client'
import type {
  PermissionContext,
  EntityOwnership,
  PermissionResult,
  RBACEntity,
  RBACAction,
} from './types'
import { hasPermission, isElevated } from './permissions'

export function canPerformAction(
  ctx: PermissionContext,
  entity: RBACEntity,
  action: RBACAction,
): PermissionResult {
  if (!hasPermission(ctx.userRole, entity, action)) {
    return {
      allowed: false,
      reason: `Papel ${ctx.userRole} não tem permissão para ${action} em ${entity}.`,
    }
  }
  return { allowed: true }
}

export function canAccessRecord(
  ctx: PermissionContext,
  ownership: EntityOwnership,
): PermissionResult {
  if (ownership.organizationId !== ctx.orgId) {
    return { allowed: false, reason: 'Registro não pertence à organização.' }
  }

  if (isElevated(ctx.userRole)) {
    return { allowed: true }
  }

  // NULL assignedTo = legacy record, visível para todos (temporário)
  if (ownership.assignedTo === null) {
    return { allowed: true }
  }

  if (ownership.assignedTo !== ctx.userId) {
    return {
      allowed: false,
      reason: 'Você não tem permissão para acessar este registro.',
    }
  }

  return { allowed: true }
}

export function canTransferOwnership(
  ctx: PermissionContext,
  currentAssignedTo: string | null,
): PermissionResult {
  if (isElevated(ctx.userRole)) {
    return { allowed: true }
  }

  if (currentAssignedTo === ctx.userId) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason:
      'Apenas administradores ou o responsável atual podem transferir registros.',
  }
}

export function resolveAssignedTo(
  ctx: PermissionContext,
  requestedAssignee?: string | null,
): string {
  if (ctx.userRole === 'MEMBER') {
    return ctx.userId
  }
  return requestedAssignee || ctx.userId
}

export function requirePermission(result: PermissionResult): void {
  if (!result.allowed) {
    throw new Error(result.reason || 'Permissão negada.')
  }
}
```

#### 1.4 `plan-limits.ts`

```typescript
import { db } from '@/_lib/prisma'
import { PLAN_LIMITS } from './permissions'

export type CountableEntity = 'contacts' | 'deals' | 'members' | 'products'

interface QuotaResult {
  allowed: boolean
  current: number
  limit: number
  reason?: string
}

export async function checkPlanQuota(
  orgId: string,
  entity: CountableEntity,
): Promise<QuotaResult> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  })

  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reason: 'Organização não encontrada.',
    }
  }

  const limits = PLAN_LIMITS[org.plan]
  const limit = limits[entity]

  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 }
  }

  let current = 0
  switch (entity) {
    case 'contacts':
      current = await db.contact.count({ where: { organizationId: orgId } })
      break
    case 'deals':
      current = await db.deal.count({ where: { organizationId: orgId } })
      break
    case 'members':
      current = await db.member.count({
        where: { organizationId: orgId, status: 'ACCEPTED' },
      })
      break
    case 'products':
      current = await db.product.count({ where: { organizationId: orgId } })
      break
  }

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      reason: `Limite do plano atingido: ${current}/${limit} ${entity}.`,
    }
  }

  return { allowed: true, current, limit }
}

export async function requireQuota(
  orgId: string,
  entity: CountableEntity,
): Promise<void> {
  const result = await checkPlanQuota(orgId, entity)
  if (!result.allowed) {
    throw new Error(result.reason)
  }
}
```

#### 1.5 `index.ts`

```typescript
export * from './types'
export * from './permissions'
export * from './guards'
export * from './plan-limits'
```

---

### Etapa 2: Data Access Layer

#### Padrão de Refatoração

**Antes:**

```typescript
export const getContacts = async (orgId: string): Promise<ContactDto[]>
```

**Depois:**

```typescript
interface RBACContext {
  orgId: string
  userId: string
  userRole: MemberRole
}

export const getContacts = async (ctx: RBACContext): Promise<ContactDto[]> => {
  const whereClause = {
    organizationId: ctx.orgId,
    ...(ctx.userRole === 'MEMBER' && { assignedTo: ctx.userId }),
  }
  // ...
}
```

#### Arquivos a Modificar

| #   | Arquivo                                      | Filtro RBAC                       |
| --- | -------------------------------------------- | --------------------------------- |
| 2.1 | `_data-access/contact/get-contacts.ts`       | MEMBER: `assignedTo: userId`      |
| 2.2 | `_data-access/contact/get-contact-by-id.ts`  | MEMBER: `assignedTo: userId`      |
| 2.3 | `_data-access/deal/get-deals-by-pipeline.ts` | **+orgId** + MEMBER: `assignedTo` |
| 2.4 | `_data-access/deal/get-deal-details.ts`      | MEMBER: `assignedTo: userId`      |
| 2.5 | `_data-access/deal/get-deals-options.ts`     | MEMBER: `assignedTo: userId`      |
| 2.6 | `_data-access/task/get-tasks.ts`             | MEMBER: `assignedTo: userId`      |
| 2.7 | `_data-access/search/global-search.ts`       | Filtrar resultados por ownership  |

**Nota:** Products e Pipeline não precisam de filtro RBAC (são globais na org).

---

### Etapa 3: Actions - Contacts

#### 3.1 `createContact`

**Arquivo:** `app/_actions/contact/create-contact/index.ts`

**Mudanças:**

1. Verificar permissão base com `canPerformAction`
2. Verificar quota do plano com `requireQuota`
3. Resolver `assignedTo` com `resolveAssignedTo` (MEMBER forçado para si)
4. Se ADMIN/OWNER especificou outro usuário, validar que é membro

#### 3.2 `updateContact`

**Arquivo:** `app/_actions/contact/update-contact/index.ts`

**Mudanças:**

1. Verificar permissão base
2. Buscar registro existente
3. Verificar acesso ao registro com `canAccessRecord`
4. Se mudando `assignedTo`, verificar `canTransferOwnership`

#### 3.3 `deleteContact`

**Arquivo:** `app/_actions/contact/delete-contact/index.ts`

**Mudanças:**

1. Verificar permissão delete (apenas ADMIN/OWNER)
2. Verificar registro existe na org

#### 3.4 `bulkDeleteContacts`

**Arquivo:** `app/_actions/contact/bulk-delete-contacts/index.ts`

**Mudanças:**

1. Mesma lógica de deleteContact

---

### Etapa 4: Actions - Deals

Seguir o mesmo padrão da Etapa 3, aplicando:

- `canAccessRecord` para verificar ownership do deal
- `canTransferOwnership` para mudanças de `assignedTo`
- `canPerformAction(ctx, 'deal', 'delete')` para exclusões

---

### Etapa 5-7: Tasks, Products, Pipeline

Seguir padrões estabelecidos nas etapas anteriores.

**Diferenças:**

- **Tasks:** MEMBER pode deletar próprias (ver matriz de permissões)
- **Products:** Apenas ADMIN+ em todas as operações
- **Pipeline:** Apenas ADMIN+ em todas as operações

---

### Etapa 8: Páginas

Atualizar chamadas ao DAL nas páginas para passar contexto completo:

```typescript
// Em Server Component
import { getOrgContext } from '@/_data-access/organization/get-organization-context'

export default async function ContactsPage({ params }) {
  const ctx = await getOrgContext(params.slug)
  const contacts = await getContacts(ctx) // Agora passa ctx completo
  // ...
}
```

---

## Matriz de Permissões (Referência Rápida)

| Entidade | Create | Read  | Update | Delete | Transfer |
| -------- | ------ | ----- | ------ | ------ | -------- |
| Contact  | ALL    | ALL\* | ALL\*  | ADMIN+ | ADMIN+   |
| Deal     | ALL    | ALL\* | ALL\*  | ADMIN+ | ADMIN+   |
| Task     | ALL    | ALL\* | ALL\*  | ALL\*  | ADMIN+   |
| Product  | ADMIN+ | ALL   | ADMIN+ | ADMIN+ | -        |
| Pipeline | ADMIN+ | ALL   | ADMIN+ | ADMIN+ | -        |

`*` = MEMBER só acessa próprios registros
`ALL` = OWNER, ADMIN, MEMBER
`ADMIN+` = OWNER, ADMIN

---

## Limites de Plano

| Plano      | Contacts | Deals | Products | Members |
| ---------- | -------- | ----- | -------- | ------- |
| FREE       | 50       | 25    | 10       | 2       |
| PRO        | 1.000    | 500   | 100      | 10      |
| ENTERPRISE | ∞        | ∞     | ∞        | ∞       |

---

## Arquivos Críticos

| Arquivo                                          | Propósito                              |
| ------------------------------------------------ | -------------------------------------- |
| `app/_lib/safe-action.ts`                        | Onde `ctx.userRole` é injetado (já OK) |
| `app/_lib/rbac/*`                                | **NOVO** - Módulo RBAC                 |
| `app/_data-access/deal/get-deals-by-pipeline.ts` | **FIX CRÍTICO** - Falta orgId          |

---

## Comandos de Verificação

```bash
# TypeScript check
pnpm build

# Desenvolvimento
pnpm dev

# Prisma Studio (verificar dados)
pnpm prisma studio
```
