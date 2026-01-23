# Kronos CRM

> **Sales AI Hub** - CRM B2B/B2C estruturado, ágil e seguro.

---

## 🚀 Comandos Essenciais

**Dependências:**

```bash
pnpm install
```

**Development:**

```bash
pnpm dev
# acess: http://localhost:3000
```

**Prisma (Banco de Dados):**

```bash
pnpm prisma generate    # Atualiza tipos do client
pnpm prisma migrate dev # Aplica mudanças no banco
pnpm prisma studio      # Visualiza dados no navegador
```

**Quality Assurance:**

```bash
pnpm lint      # Verifica erros de ESLint
pnpm format    # Formata código com Prettier (se houver script)
```

---

## 🌍 Variáveis de Ambiente

Crie um arquivo `.env` na raiz baseado no `.env.example`:

| Variável                        | Descrição                                                     |
| ------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                  | String de conexão do PostgreSQL (Supabase Transaction Pooler) |
| `DIRECT_URL`                    | Conexão direta (Session Pooler) para migrations               |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL do Projeto Supabase                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anônima                                         |

---

## 🛠️ Stack & Dependências Internas

- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth (SSR)
- **Estilização:** Tailwind CSS + Shadcn/ui (Radix Primitives)
- **Server Actions:** `next-safe-action` (validação e type-safety)
- **Forms:** `react-hook-form` + `zod`

---

## 📝 Regras de Codificação

### Padrão Geral

- **Idioma:** Todo código deve ser em **Inglês** (variáveis, funções, rotas). Comentários podem ser em **Português**.
- **Legibilidade:** Evite métodos longos. Se cresceu, quebre em funções menores.
- **Comentários:** O código deve ser auto-explicativo. Use comentários apenas para explicar o _PORQUÊ_ de decisões complexas, não o _O QUE_ o código faz.
- **Magic Numbers:** Mova para constantes (`const MAX_RETRY = 3`).

### TypeScript & JS Moderno

- **Pacotes:** Use `pnpm` exclusivamente.
- **Declaração:** Prefira `const` sempre. Use `let` apenas se necessário reatribuir.
- **Tipagem:** Use `interface` para objetos e `type` para uniões/interseções complexas.
- **Async:** Sempre use `async/await` (evite `.then()`).
- **Validação:** Não ignore erros de TS (`any` é proibido).

### Estrutura de Métodos

- **Nome:** Verbo + Substantivo (ex: `getUser`, `createCompany`).
- **Fluxo:** Evite `else`. Use **Early Returns**.

  ```ts
  // ✅ Bom
  if (!user) return null
  return user.data

  // ❌ Ruim
  if (user) {
    return user.data
  } else {
    return null
  }
  ```

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
- Filtre dados sempre pelo dono (`ownerId`) para garantir multi-tenancy.

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

## 📦 Convenção de Commits

Seguimos o padrão **Conventional Commits**:

```
<type>(<scope>): <description>
```

### Tipos

| Tipo       | Uso                                              |
| ---------- | ------------------------------------------------ |
| `feat`     | Nova funcionalidade                              |
| `fix`      | Correção de bug                                  |
| `refactor` | Refatoração de código (sem mudar funcionalidade) |
| `chore`    | Tarefas de manutenção (deps, configs)            |
| `docs`     | Documentação                                     |
| `style`    | Formatação (sem mudar lógica)                    |
| `test`     | Adição/correção de testes                        |

### Scopes Comuns

- `schema` - Mudanças no Prisma schema
- `deal`, `contact`, `product` - Módulos específicos
- `pipeline`, `kanban` - Funcionalidades de pipeline
- `ui` - Componentes de interface
- `auth` - Autenticação
- `deps` - Dependências

### Exemplos

```bash
git commit -m "feat(deal): add mark won/lost actions"
git commit -m "refactor(kanban): improve card design"
git commit -m "chore(deps): add shadcn tabs component"
git commit -m "fix(auth): handle expired session"
```

---

## 🧪 Testes (Futuro)

- Usaremos Jest/Vitest.
- Foco em testes de integração para Server Actions críticas.
