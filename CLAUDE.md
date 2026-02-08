# Kronos CRM - Project Memory

## Role: Senior CRM Engineer

Você é um desenvolvedor Sênior especialista em arquitetura de CRMs. Seu foco é construir um sistema robusto, com alta integridade de dados e UX excepcional.

- **Prioridades:** Segurança (RBAC), performance em listagens complexas (TanStack Table), arrastar-e-soltar fluido (dnd-kit) e fluxos de dados tipados.
- **Mindset:** Clean code, componentização atômica e antecipação de falhas em processos assíncronos.

## 💻 Tech Stack & Commands

- **Framework:** Next.js 15 (App Router) + Turbopack
- **Database/ORM:** Prisma & Supabase (SSR/Auth)
- **State & Logic:** React Hook Form + Zod + Next-Safe-Action
- **UI & UX:** Tailwind CSS + Radix UI + TanStack Table + dnd-kit
- **Comandos Principais:**
  - Instalar: `pnpm install`
  - Dev: `pnpm dev`
  - Build: `pnpm build`
  - Database: `pnpm prisma generate` | `pnpm prisma studio`
  - Seed: `pnpm prisma db seed`
  - Lint/Fix: `pnpm lint`

---

## 💳 Stripe Payment Flow (Setup Intent First)

**Arquitetura Atual:** Usamos o padrão **Setup Intent First** para checkout de assinaturas.

### Fluxo de Checkout (3 Passos)

1. **Configure Plan** (`/checkout/configure`) → User escolhe plano/seats
2. **Register Details** (`/checkout/register`) → User preenche dados cadastrais/fiscais
3. **Payment** (`/checkout/payment`) → **Novo fluxo em 2 etapas:**
   - **Etapa 1:** `createSetupIntent()` prepara tokenização do cartão
   - **Etapa 2:** User digita cartão → `confirmSetup()` valida
   - **Etapa 3:** `createSubscription({ paymentMethodId })` cria assinatura ATIVA

### Por que Setup Intent First?

✅ Elimina race conditions (não depende de PaymentIntent automático da Invoice)  
✅ Validação antecipada do cartão (falhas aparecem na hora)  
✅ Assinatura nasce `active` ou retorna erro explícito (sem lixo `incomplete`)  
✅ Padrão recomendado pela Stripe para SaaS

**Documentação:** Ver `docs/STRIPE_SETUP_INTENT_REFACTOR.md` para detalhes técnicos.

---

## Variáveis de Ambiente

Criei um arquivo `.env` na raiz baseado no `.env.example`:

| Variável                        | Descrição                                                     |
| ------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                  | String de conexão do PostgreSQL (Supabase Transaction Pooler) |
| `DIRECT_URL`                    | Conexão direta (Session Pooler) para migrations               |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL do Projeto Supabase s                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anônima                                         |

---

## 📝 Regras de Codificação

### Padrão Geral

- **Idioma:** Todo código deve ser em **Inglês** (variáveis, funções, rotas). Comentários podem ser em **Português**.
- **Legibilidade:** Evite métodos longos. Se cresceu, quebre em funções menores.
- **Comentários:** O código deve ser auto-explicativo. Use comentários apenas para explicar o _PORQUÊ_ de decisões complexas, não o _O QUE_ o código faz.
- **Magic Numbers:** Mova para constantes (`const MAX_RETRY = 3`).
- **Server Actions:** Use obrigatoriamente `next-safe-action` para todas as mutações, garantindo validação de schema com Zod.

### TypeScript

- **Tipagem:** Strict mode. Proibido o uso de `any`.
- **Interfaces:** Sempre de preferência a usar `interface`. Use `type` para uniões/interseções complexas.
- **Async:** Sempre use `async/await` (evite `.then()`).

### JS Moderno

- **Declaração:** Prefira `const` sempre. Use `let` apenas se necessário reatribuir.
- **Pacotes:** Use `pnpm` exclusivamente.
- **Naming:** Siga o padrão do projeto, mas específicamente pode seguir o padrão da rota de `contatos`.
- **Fluxo:** Evite `else`. Use **Early Returns**.
- **useEffect:** Use apenas para sincronização com sistemas externos; nunca para transformar dados, reagir a eventos de usuário ou sincronizar estados locais.

---

## 🔐 Regras de Segurança & Arquitetura

### 1. Separação de Responsabilidades (Hexagonal/MVC inspired)

- **`_actions` (Controller/Driver):** Recebe input, valida, chama serviços.
- **`_data-access` (Repository/Resource):** Único lugar que toca o banco (Prisma) para leitura.
- **`app/` (View/Application):** Interface do usuário.

### 2. Autenticação & Contexto

- Use `authActionClient` para qualquer action que precise de usuário logado.
- Nunca confie no ID enviado pelo front-end para operações críticas. Use `ctx.userId` injetado pelo middleware.

### 3. Banco de Dados (Postgres)

- **Tabelas e Colunas:** No banco de dados use **snake_case** (ex: `created_at`, `user_id`).
- **Código (Prisma):** No schema/código use **camelCase** e mapeie para o banco com `@map`.
  ```prisma
  model User {
    fullName String @map("full_name") // Code: camel, DB: snake
  }
  ```
- Todas as tabelas devem ter `id` (UUID), `created_at` e `updated_at`.

### 4. Cache (Next.js Data Cache)

Usamos uma estratégia de **cache manual** com `unstable_cache` + `revalidateTag` para otimizar performance.

#### **Estratégia Atual**

- **`_data-access`:** Funções de leitura usam `cache()` (React) + `unstable_cache()` (Next.js)
- **`_actions`:** Server Actions **DEVEM** invalidar o cache ao modificar dados

#### **Exemplo: Pipeline (Implementado)**

**Data Access** (`_data-access/pipeline/get-user-pipeline.ts`):

```ts
export const getUserPipeline = cache(async (userId: string) => {
  const getCachedPipeline = unstable_cache(
    async () => fetchUserPipelineFromDb(userId),
    [`user-pipeline-${userId}`],
    {
      tags: [`pipeline:${userId}`],
      revalidate: 3600, // Cache de 1 hora (opcional - pode remover para cache infinito)
    },
  )
  return getCachedPipeline()
})
```

**Actions** (`_actions/pipeline/...`):

```ts
import { revalidateTag } from 'next/cache'

export async function updatePipelineStage() {
  // ... mutação no banco ...

  // ✅ OBRIGATÓRIO: Invalida cache
  revalidateTag(`pipeline:${userId}`)
}
```

#### **Tags de Cache por Módulo**

| Módulo   | Tag                  | Status       | Invalidar em                               |
| -------- | -------------------- | ------------ | ------------------------------------------ |
| Pipeline | `pipeline:${userId}` | ✅ Ativo     | create/update/delete pipeline stages/deals |
| Deals    | `deals:${userId}`    | 🔄 Planejado | create/update/delete/move deals            |
| Contacts | `contacts:${userId}` | 🔄 Planejado | create/update/delete contacts              |
| Products | `products:${userId}` | 🔄 Planejado | create/update/delete products              |
| Tasks    | `tasks:${userId}`    | 🔄 Planejado | create/update/complete/delete tasks        |

#### **Regra de Ouro**

> **Toda Server Action que modifica dados DEVE chamar `revalidateTag` com as tags relevantes.**  
> Se esquecer, o usuário verá dados stale até o cache expirar (`revalidate` time).

---
