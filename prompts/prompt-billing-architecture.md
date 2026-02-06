## Identidade

Você é um Arquiteto de Software e Desenvolvedor Senior especializado em SaaS B2B e Stripe.

## Contexto

O Kronos CRM está migrando para uma arquitetura de Billing robusta focada em Multi-Tenancy e Multi-Produtos. Precisamos preparar o banco de dados para suportar assinaturas via Stripe, onde uma Organização pode ter múltiplas assinaturas ativas de produtos diferentes (ex: CRM, Chatbot, API).

Consulte o arquivo `prisma/schema.prisma` atual para entender a base.

## Modos operante

1. Entenda a missão e a arquitetura proposta.
2. Estipule o plano de alteração do Schema.
   [Aprovação do usuário]
3. Execute a refatoração do Schema.
4. Gere a migration.

## Objetivo

Refatorar o `schema.prisma` para separar responsabilidades de Identidade (Organization) e Acesso/Contrato (Subscription), preparando o terreno para a integração com Stripe seguindo o padrão "Clean Architecture" discutido.

## Especificação Técnica da Mudança

### 1. Model: Organization (Refatoração)

A Organização deve ser a "Single Source of Truth" para dados cadastrais e fiscais do cliente.

- **Manter:** Dados de identidade (`id`, `name`, `slug`).
- **Garantir/Adicionar:** Campo `stripeCustomerId` (String? @unique @map("stripe_customer_id")).
- **Manter/Refinar:** Campos de Dados Fiscais/Endereço (`taxId`, `legalName`, `billingAddress`, `personType`, etc.).
- **REMOVER (Deprecated):** Campos que atrelam a um único plano diretamente na tabela, como `plan` e `subscriptionStatus`. A "verdade" sobre o acesso agora virá da tabela de `subscriptions`. Se necessário, mantenha apenas como cache, mas a preferência é mover a lógica para a tabela `Subscription`.

### 2. Model: Subscription (Refatoração Maior)

Esta tabela deve deixar de ser vinculada ao `User` e passar a ser vinculada à `Organization`. Ela representa um "Contrato Ativo".

- **Relacionamento:** Mudar de `User` para `Organization` (1:N - Uma org pode ter várias assinaturas).
- **Campos Essenciais (Stripe Mirror):**
  - `stripeSubscriptionId` (String @unique).
  - `stripePriceId` (String) -> Identifica o produto/plano contratado.
  - `status` (Enum) -> Deve refletir os status do Stripe (`active`, `past_due`, `canceled`, `trialing`, `incomplete`).
  - `currentPeriodEnd` (DateTime) -> Data de validade do acesso.
  - `cancelAtPeriodEnd` (Boolean) -> Se o usuário cancelou mas ainda tem acesso até o fim do ciclo.
- **Flexibilidade:**
  - `metadata` (Json?) -> Para guardar chaves lógicas de produto (ex: `product_key: "crm_pro"`).

### 3. Server Action Pattern (Padrão de Código)

Ao criar as Server Actions necessárias para o billing (ex: `createSubscriptionIntent`), siga estritamente o padrão do projeto:

- **Library:** Use `next-safe-action` (`orgActionClient`).
- **Validação:** Use `zod` para validar inputs.
- **Segurança (RBAC):**
  - Use `requirePermission` e `canPerformAction` para validar se o usuário pode alterar billing (Geralmente OWNER/ADMIN).
  - Sempre filtre queries pelo `ctx.orgId` para garantir isolamento multi-tenant.
- **Cache:** Use `revalidateTag` e `revalidatePath` quando necessário.

Exemplo de estrutura:

```typescript
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { requirePermission, canPerformAction } from '@/_lib/rbac'

export const myAction = orgActionClient
  .schema(mySchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(canPerformAction(ctx, 'billing', 'manage'))
    // lógica...
  })
```

### 4. Limpeza

- Verifique se há Enums antigos que não serão mais usados e remova-os ou atualize-os para o padrão do Stripe.

## Requisitos

- Siga o arquivo /Users/paulororiz/Documents/Dev/01_projetos/01_dev/kronos-crm/CLAUDE.md
- Use `@map` para garantir colunas em `snake_case` no Postgres.
- Não apague dados destrutivamente sem avisar (se houver dados em produção, o plano de migração deve considerar isso, mas para dev, pode refatorar).
