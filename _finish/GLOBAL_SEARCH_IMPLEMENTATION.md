# Busca Global (Command K)

## Visão Geral

Implementação de busca global com atalho `Cmd+K` (Mac) / `Ctrl+K` (Windows) para pesquisar Contatos, Empresas e Deals em um único lugar usando o `CommandDialog` do shadcn/ui.

---

## Arquitetura

### Abordagem: Server-side search com debouncing

**Justificativa:**
- **Segurança**: Multi-tenancy filtering acontece server-side
- **Performance**: Busca apenas dados relevantes
- **Escalabilidade**: Funciona bem com crescimento de dados
- **Tempo real**: Resultados refletem estado atual do banco

### Parâmetros de Busca

| Parâmetro | Valor |
|-----------|-------|
| Debounce | 300ms |
| Query mínima | 3 caracteres |
| Limite Deals | 5 resultados |
| Limite Contatos | 3 resultados |
| Limite Empresas | 2 resultados |
| **Total máximo** | **10 resultados** |

---

## Estrutura de Arquivos

### Arquivos Criados

```
app/
├── _types/
│   └── global-search.ts          # Interfaces TypeScript
├── _hooks/
│   └── use-debounce.ts           # Hook genérico de debounce
├── _data-access/
│   └── search/
│       └── global-search.ts      # Data access com Prisma
├── _actions/
│   └── search/
│       └── global-search/
│           ├── schema.ts         # Schema Zod
│           └── index.ts          # Server action
└── _components/
    └── global-search/
        ├── use-global-search.ts          # Hook de busca
        ├── search-result-item.tsx        # Item de resultado
        ├── global-search-dialog.tsx      # Dialog principal
        └── index.tsx                     # Componente exportado
```

### Arquivos Modificados

| Arquivo | Modificação |
|---------|-------------|
| `app/_components/header.tsx` | Adicionado `<GlobalSearch />` |
| `app/_components/ui/command.tsx` | Adicionado `DialogTitle` para acessibilidade e prop `shouldFilter` |

---

## Interfaces TypeScript

```typescript
// app/_types/global-search.ts

export type SearchResultType = 'contact' | 'company' | 'deal'

export interface SearchResultItem {
  id: string
  type: SearchResultType
  title: string
  subtitle: string | null
  href: string
}

export interface GlobalSearchResult {
  contacts: SearchResultItem[]
  companies: SearchResultItem[]
  deals: SearchResultItem[]
  totalCount: number
}
```

---

## Rotas de Navegação

| Entidade | Rota | Exemplo |
|----------|------|---------|
| Contato | `/contacts/[id]` | `/contacts/abc-123` |
| Deal | `/pipeline/deal/[id]` | `/pipeline/deal/xyz-789` |
| Empresa | `/contacts?company=[id]` | `/contacts?company=def-456` |

---

## Detalhes de Implementação

### 1. Hook de Debounce (`use-debounce.ts`)

Hook genérico e reutilizável para debouncing de valores.

```typescript
export function useDebounce<T>(value: T, delay: number): T
```

### 2. Data Access (`global-search.ts`)

Queries Prisma executadas em paralelo usando `Promise.all`:

- **Contacts**: Busca por `name`, `email`, `phone` (case-insensitive)
- **Companies**: Busca por `name` (case-insensitive)
- **Deals**: Busca por `title` + nome dos contatos relacionados

**Multi-tenancy:**
- Contacts/Companies: `ownerId: userId`
- Deals: `stage.pipeline.createdBy: userId`

### 3. Server Action (`global-search/index.ts`)

- Usa `authActionClient` do next-safe-action (requer autenticação)
- Schema Zod: query com 3-100 caracteres
- Retorna `GlobalSearchResult`

### 4. Hook de Busca (`use-global-search.ts`)

Integra:
- Estado local para query e results
- Debounce de 300ms
- `useAction` do next-safe-action
- Reset automático ao fechar

### 5. Componente de Item (`search-result-item.tsx`)

Ícones por tipo de entidade:
- `User` → Contato
- `Building2` → Empresa
- `Kanban` → Deal

### 6. Dialog Principal (`global-search-dialog.tsx`)

Estados renderizados:
- Loading spinner durante busca
- Mensagem "Digite pelo menos 3 caracteres"
- Empty state "Nenhum resultado encontrado"
- Resultados agrupados por categoria

**Importante:** Usa `shouldFilter={false}` no `CommandDialog` para desabilitar filtragem client-side do cmdk (busca é server-side).

### 7. Componente Principal (`index.tsx`)

- Botão trigger com visual do atalho (⌘K)
- Event listener global para `Cmd+K` / `Ctrl+K`
- Controla estado open/close do dialog

---

## Acessibilidade

O `CommandDialog` inclui um `DialogTitle` visualmente oculto (classe `sr-only`) para compatibilidade com leitores de tela, conforme requisito do Radix UI.

```tsx
<DialogTitle className="sr-only">Busca global</DialogTitle>
```

---

## Layout do Header

```
┌─────────────────────────────────────────────────────────┐
│                    [🔍 Buscar...  ⌘K]  [🌙]             │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo de Uso

1. Usuário pressiona `Cmd+K` (Mac) ou `Ctrl+K` (Windows)
2. Dialog de busca abre
3. Usuário digita query (mínimo 3 caracteres)
4. Após 300ms de debounce, busca server-side é executada
5. Resultados aparecem agrupados por categoria
6. Navegação com setas ↑↓ entre resultados
7. Enter ou clique → Navega para página do item
8. Esc → Fecha dialog

---

## Dependências

Todas as dependências já estavam instaladas no projeto:

- `cmdk` (v1.1.1) - Command component do shadcn
- `next-safe-action` - Server actions tipadas
- `lucide-react` - Ícones
- `zod` - Validação de schema

**Nenhuma nova dependência foi necessária.**

---

## Queries Prisma

### Contacts
```typescript
db.contact.findMany({
  where: {
    ownerId: userId,
    OR: [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { phone: { contains: searchTerm, mode: 'insensitive' } },
    ],
  },
  take: 3,
})
```

### Companies
```typescript
db.company.findMany({
  where: {
    ownerId: userId,
    name: { contains: searchTerm, mode: 'insensitive' },
  },
  take: 2,
})
```

### Deals
```typescript
db.deal.findMany({
  where: {
    stage: {
      pipeline: {
        createdBy: userId,
      },
    },
    OR: [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      {
        contacts: {
          some: {
            contact: {
              name: { contains: searchTerm, mode: 'insensitive' },
            },
          },
        },
      },
    ],
  },
  take: 5,
})
```

---

## Troubleshooting

### Resultados não aparecem / somem rapidamente

**Causa:** O componente `cmdk` faz filtragem automática client-side por padrão.

**Solução:** Passar `shouldFilter={false}` ao `CommandDialog` para desabilitar filtragem client-side quando usando busca server-side.

### Warning de acessibilidade (DialogTitle)

**Causa:** Radix UI requer `DialogTitle` para screen readers.

**Solução:** Adicionar `<DialogTitle className="sr-only">` dentro do `DialogContent`.

---

## Autor

Implementado com Claude Code em Janeiro/2026.
