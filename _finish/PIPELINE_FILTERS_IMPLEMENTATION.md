# Implementação de Filtros Avançados para Pipeline

**Data:** 29 de Janeiro de 2026
**Módulo:** Pipeline de Vendas (Kanban)

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Arquivos Criados](#arquivos-criados)
3. [Arquivos Modificados](#arquivos-modificados)
4. [Estrutura dos Filtros](#estrutura-dos-filtros)
5. [Persistência na URL](#persistência-na-url)
6. [Componentes](#componentes)
7. [Fluxo de Dados](#fluxo-de-dados)
8. [Como Usar](#como-usar)
9. [Verificação e Testes](#verificação-e-testes)

---

## Visão Geral

Foi implementado um sistema de filtros avançados para o Pipeline de Vendas (Kanban) do Kronos CRM. O sistema permite filtrar deals por múltiplos critérios simultaneamente, com persistência dos filtros na URL via query params.

### Funcionalidades Implementadas

- Filtro de **Status** (multi-select)
- Filtro de **Prioridade** (multi-select)
- Filtro de **Data Prevista de Fechamento** (range de datas)
- Filtro de **Valor do Deal** (range numérico)
- **Persistência na URL** para compartilhamento e bookmarks
- **Badges visuais** dos filtros ativos com remoção individual
- **Botão "Limpar todos"** para resetar filtros

---

## Arquivos Criados

### 1. `app/_components/ui/sheet.tsx`

Componente Sheet do shadcn/ui instalado via CLI:

```bash
npx shadcn@latest add sheet
```

Este componente é usado para exibir o painel lateral de filtros.

---

### 2. `app/(authenticated)/pipeline/_lib/pipeline-filters.ts`

Define os tipos e constantes dos filtros.

```typescript
import { DealStatus, DealPriority } from '@prisma/client'

export interface PipelineFilters {
  status: DealStatus[]
  priority: DealPriority[]
  expectedCloseDateFrom: Date | null
  expectedCloseDateTo: Date | null
  valueMin: number | null
  valueMax: number | null
}

export const DEFAULT_FILTERS: PipelineFilters = {
  status: [],
  priority: [],
  expectedCloseDateFrom: null,
  expectedCloseDateTo: null,
  valueMin: null,
  valueMax: null,
}

export const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Novo', color: 'bg-kronos-blue/10 text-kronos-blue border-kronos-blue/20' },
  { value: 'IN_PROGRESS', label: 'Em Andamento', color: 'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20' },
  { value: 'WON', label: 'Vendido', color: 'bg-kronos-green/10 text-kronos-green border-kronos-green/20' },
  { value: 'LOST', label: 'Perdido', color: 'bg-kronos-red/10 text-kronos-red border-kronos-red/20' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20' },
]

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]
```

---

### 3. `app/(authenticated)/pipeline/_lib/use-pipeline-filters.ts`

Hook customizado para sincronização entre URL e estado local.

**Funcionalidades:**
- Lê filtros da URL (query params)
- Atualiza URL quando filtros mudam
- Fornece contador de filtros ativos
- Função para limpar todos os filtros

**Parâmetros de URL suportados:**
| Parâmetro | Exemplo | Descrição |
|-----------|---------|-----------|
| `status` | `?status=OPEN,IN_PROGRESS` | Status dos deals (separados por vírgula) |
| `priority` | `?priority=high,urgent` | Prioridades (separadas por vírgula) |
| `dateFrom` | `?dateFrom=2026-01-01` | Data inicial (ISO format) |
| `dateTo` | `?dateTo=2026-03-31` | Data final (ISO format) |
| `valueMin` | `?valueMin=1000` | Valor mínimo |
| `valueMax` | `?valueMax=50000` | Valor máximo |

**Retorno do Hook:**
```typescript
{
  filters: PipelineFilters,        // Estado atual dos filtros
  setFilters: (filters) => void,   // Atualiza filtros parcialmente
  clearFilters: () => void,        // Limpa todos os filtros
  activeFilterCount: number,       // Quantidade de categorias com filtros ativos
  hasActiveFilters: boolean        // Se há algum filtro ativo
}
```

---

### 4. `app/(authenticated)/pipeline/_components/pipeline-filters-sheet.tsx`

Componente Sheet com os controles de filtro.

**Características:**
- Abre pela direita da tela
- Estado local para edição antes de aplicar
- Checkboxes estilizados como botões toggle para Status e Prioridade
- Date pickers usando o componente Calendar existente
- Inputs numéricos para range de valor
- Botões "Limpar" e "Aplicar Filtros"
- Badge com contagem de filtros ativos no botão trigger

**Props:**
```typescript
interface PipelineFiltersSheetProps {
  filters: PipelineFilters
  onFiltersChange: (filters: Partial<PipelineFilters>) => void
  activeFilterCount: number
}
```

---

### 5. `app/(authenticated)/pipeline/_components/pipeline-filter-badges.tsx`

Componente que exibe badges para cada filtro ativo.

**Características:**
- Cada badge mostra o tipo e valor do filtro
- Botão X para remover filtro individual
- Botão "Limpar todos" no final
- Não renderiza nada se não há filtros ativos

**Props:**
```typescript
interface PipelineFilterBadgesProps {
  filters: PipelineFilters
  onFiltersChange: (filters: Partial<PipelineFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}
```

---

## Arquivos Modificados

### 1. `app/(authenticated)/pipeline/_components/pipeline-client.tsx`

**Alterações:**
- Importação dos novos componentes e hook
- Uso do `usePipelineFilters()` hook
- Passagem de props de filtro para o `KanbanBoard`

```typescript
// Novos imports
import { PipelineFiltersSheet } from './pipeline-filters-sheet'
import { PipelineFilterBadges } from './pipeline-filter-badges'
import { usePipelineFilters } from '../_lib/use-pipeline-filters'

// Uso do hook
const {
  filters,
  setFilters,
  clearFilters,
  activeFilterCount,
  hasActiveFilters,
} = usePipelineFilters()

// Props passadas para KanbanBoard
<KanbanBoard
  ...
  filters={filters}
  filtersSheet={<PipelineFiltersSheet ... />}
  filterBadges={<PipelineFilterBadges ... />}
/>
```

---

### 2. `app/(authenticated)/pipeline/_components/kanban-board.tsx`

**Alterações:**

1. **Novas props na interface:**
```typescript
interface KanbanBoardProps {
  // ... props existentes
  filters: PipelineFilters
  filtersSheet: React.ReactNode
  filterBadges: React.ReactNode
}
```

2. **Lógica de filtragem no `useMemo`:**
```typescript
const filteredDealsByStage = useMemo(() => {
  // ... código existente de busca por texto

  // Filtro de Status
  if (filters.status.length > 0) {
    stageDeals = stageDeals.filter((deal) =>
      filters.status.includes(deal.status)
    )
  }

  // Filtro de Prioridade
  if (filters.priority.length > 0) {
    stageDeals = stageDeals.filter((deal) =>
      filters.priority.includes(deal.priority)
    )
  }

  // Filtro de Range de Datas
  if (filters.expectedCloseDateFrom || filters.expectedCloseDateTo) {
    stageDeals = stageDeals.filter((deal) => {
      if (!deal.expectedCloseDate) return false
      const dealDate = new Date(deal.expectedCloseDate)
      if (filters.expectedCloseDateFrom && dealDate < filters.expectedCloseDateFrom) return false
      if (filters.expectedCloseDateTo && dealDate > filters.expectedCloseDateTo) return false
      return true
    })
  }

  // Filtro de Range de Valor
  if (filters.valueMin !== null || filters.valueMax !== null) {
    stageDeals = stageDeals.filter((deal) => {
      if (filters.valueMin !== null && deal.totalValue < filters.valueMin) return false
      if (filters.valueMax !== null && deal.totalValue > filters.valueMax) return false
      return true
    })
  }

  // ... ordenação existente
}, [optimisticDeals, searchQuery, sortBy, filters]) // filters adicionado às dependências
```

3. **Layout da toolbar atualizado:**
```tsx
<div className="flex flex-col gap-2">
  <div className="flex items-center gap-2">
    <KanbanSearch ... />
    <Select ... /> {/* Ordenação */}
    {filtersSheet}
  </div>
  {filterBadges}
</div>
```

---

## Estrutura dos Filtros

```
┌─────────────────────────────────────────────────────────────────┐
│                        PipelineFilters                          │
├─────────────────────────────────────────────────────────────────┤
│  status: DealStatus[]                                           │
│    └─ OPEN | IN_PROGRESS | WON | LOST | PAUSED                 │
│                                                                 │
│  priority: DealPriority[]                                       │
│    └─ low | medium | high | urgent                             │
│                                                                 │
│  expectedCloseDateFrom: Date | null                             │
│  expectedCloseDateTo: Date | null                               │
│                                                                 │
│  valueMin: number | null                                        │
│  valueMax: number | null                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Persistência na URL

### Exemplos de URLs

```
/pipeline
  → Sem filtros

/pipeline?status=OPEN
  → Apenas deals com status "Novo"

/pipeline?status=OPEN,IN_PROGRESS&priority=high,urgent
  → Deals novos ou em andamento, com prioridade alta ou urgente

/pipeline?dateFrom=2026-01-01&dateTo=2026-03-31
  → Deals com data prevista de fechamento no Q1 2026

/pipeline?valueMin=5000&valueMax=50000
  → Deals com valor entre R$ 5.000 e R$ 50.000

/pipeline?status=WON&valueMin=10000
  → Deals vendidos com valor acima de R$ 10.000
```

---

## Componentes

### Hierarquia de Componentes

```
PipelineClient
├── usePipelineFilters() [hook]
└── KanbanBoard
    ├── KanbanSearch
    ├── Select (ordenação)
    ├── PipelineFiltersSheet [slot: filtersSheet]
    │   ├── Sheet
    │   ├── Checkboxes (Status)
    │   ├── Checkboxes (Prioridade)
    │   ├── Calendar (Data Inicial)
    │   ├── Calendar (Data Final)
    │   └── Input (Valor Min/Max)
    ├── PipelineFilterBadges [slot: filterBadges]
    │   └── Badge[] (filtros ativos)
    └── KanbanColumn[]
        └── KanbanCard[]
```

---

## Fluxo de Dados

```
┌──────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE DADOS                             │
└──────────────────────────────────────────────────────────────────────┘

1. LEITURA (URL → Estado)
   URL ──► useSearchParams() ──► useMemo() ──► filters (state)

2. ATUALIZAÇÃO (Usuário → URL)
   User Action ──► setFilters() ──► URLSearchParams ──► router.replace()

3. FILTRAGEM (Estado → UI)
   filters ──► filteredDealsByStage (useMemo) ──► KanbanColumn ──► KanbanCard

┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌─────────┐    ┌──────────────────┐    ┌───────────────────┐     │
│   │   URL   │◄──►│ usePipelineFilters│◄──►│ PipelineFiltersSheet│    │
│   └─────────┘    └──────────────────┘    └───────────────────┘     │
│        │                  │                                         │
│        │                  ▼                                         │
│        │         ┌──────────────────┐                              │
│        │         │   KanbanBoard    │                              │
│        │         │  (filtragem)     │                              │
│        │         └──────────────────┘                              │
│        │                  │                                         │
│        │                  ▼                                         │
│        │         ┌──────────────────┐                              │
│        └────────►│  Deals Filtrados │                              │
│                  └──────────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Como Usar

### 1. Acessar a página do Pipeline
Navegue para `/pipeline`

### 2. Abrir o painel de filtros
Clique no botão **"Filtros"** na toolbar

### 3. Selecionar filtros desejados
- Clique nos botões de Status para selecioná-los
- Clique nos botões de Prioridade para selecioná-los
- Use os calendários para definir range de datas
- Digite valores nos campos de valor mínimo/máximo

### 4. Aplicar filtros
Clique em **"Aplicar Filtros"** para confirmar

### 5. Visualizar filtros ativos
Os badges abaixo da toolbar mostram os filtros aplicados

### 6. Remover filtros individuais
Clique no **X** em cada badge para remover aquele filtro

### 7. Limpar todos os filtros
Clique em **"Limpar todos"** para resetar

### 8. Compartilhar URL filtrada
Copie a URL do navegador para compartilhar a visualização filtrada

---

## Verificação e Testes

### Checklist de Verificação

- [ ] Acessar `/pipeline`
- [ ] Clicar em "Filtros" → Sheet abre pela direita
- [ ] Selecionar filtros de Status (ex: OPEN, IN_PROGRESS)
- [ ] Selecionar filtros de Prioridade (ex: high)
- [ ] Definir range de datas
- [ ] Definir range de valor
- [ ] Clicar "Aplicar Filtros" → URL atualiza, deals filtram
- [ ] Verificar badges dos filtros ativos aparecem
- [ ] Remover filtro individual via X no badge
- [ ] Copiar URL e abrir em nova aba → filtros persistem
- [ ] Clicar "Limpar todos" → volta ao estado inicial
- [ ] Verificar que busca por texto continua funcionando junto com filtros

### Comandos de Verificação

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Dev server
npm run dev
```

---

## Dependências Utilizadas

### Componentes shadcn/ui
- `Sheet` (novo - instalado)
- `Button`
- `Badge`
- `Checkbox`
- `Calendar`
- `Popover`
- `Input`
- `Label`

### Bibliotecas
- `date-fns` (formatação de datas)
- `lucide-react` (ícones)
- `@prisma/client` (tipos DealStatus, DealPriority)

### Helpers Existentes
- `formatCurrency` de `@/_helpers/format-currency`
- `cn` de `@/_lib/utils`

---

## Considerações Técnicas

### Performance
- Filtros são aplicados client-side usando `useMemo`
- Evita re-fetches desnecessários do servidor
- URL é atualizada com `router.replace()` (sem adicionar ao histórico)

### UX
- Estado local no Sheet permite "preview" antes de aplicar
- Badges permitem remoção rápida de filtros individuais
- Filtros persistem na URL para compartilhamento

### Manutenibilidade
- Tipos centralizados em `pipeline-filters.ts`
- Hook `usePipelineFilters` encapsula toda lógica de URL
- Componentes de UI separados e reutilizáveis

---

*Documento gerado automaticamente como parte da implementação dos Filtros Avançados do Pipeline.*
