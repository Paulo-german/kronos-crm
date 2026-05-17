# PLAN-reports-shell.md — Rota `/reports` (Shell + Seções MVP)

> Status: **✅ MVP COMPLETO** — Fases 1-6 implementadas e commitadas. Fases 7 (Team) e 8 (Products) com placeholder "Em breve". Pendências documentadas em Open Decisions.
> Pré-requisitos: `PLAN-crm-data-model.md` ✅ (migrations em produção), `PLAN-goals.md` ✅ (`GoalProgressCard` reusável disponível), `PLAN-lifecycle-automations.md` ✅ (`CaptureEvent`, `DealCaptureEvent`, `ContactLifecycleHistory` populados).
> Referência canônica de produto: `PLAN-customer-lifecycle.md` §1 (superfícies), §3.10 (Goals), §3.11 (modelo de atribuição), §8 (métrica âncora).
> Padrão de qualidade: `PLAN-goals.md` (mesma estrutura — fases, critérios, open decisions).

---

## 0. Objetivo

`/reports` é a superfície **analítica** do Kronos. Responde "como estamos indo" enquanto Dashboard responde "o que precisa de atenção agora" e Copiloto responde "o que faço hoje". O usuário-alvo é admin/owner (uso semanal/mensal), não vendedor (uso diário).

**Três decisões de produto cristalizadas que este PLAN materializa:**

1. **Reports ≠ Dashboard atual.** Não é um rename nem uma reorganização das tabs do dashboard. É um conceito novo: navegação em sidebar (não tabs), drill-down em Sheet por KPI, comparação de período padrão em todo número, atribuição rotulada explicitamente, metas contextuais por seção, gating por plano. Componentes do dashboard podem ser **adaptados** ou **inspirar**, mas a leitura é diferente.

2. **Shell antes das seções.** A Fase 1 entrega só o esqueleto (layout, sidebar, config-driven, filtros globais, plano gating, rota `/overview` mínima) — sem nenhum gráfico novo. Cada seção MVP entra como fase isolada (2–8), reduzindo risco de PR gigante e permitindo testar a navegação cedo.

3. **Metas vivem onde fazem sentido — não há `/reports/goals`.** Decisão já cristalizada em `PLAN-goals.md`. O `GoalProgressCard` é consumido contextualmente: ORG em `/reports/overview`, por pipeline em `/reports/pipeline`, por membro em `/reports/team`.

**Não-objetivos desta fase:**
- Não substituir o dashboard atual (`/dashboard` continua intacto — redesign é outro PLAN).
- Não criar PDF assíncrono (fica para fase 2, fora do MVP).
- Não criar relatório customizado pelo usuário (datasource builder) — fora de escopo.

---

## 1. Visão Geral — Estrutura de Rota e Componentes

```
app/(authenticated)/org/[orgSlug]/(main)/reports/
├── layout.tsx                                  # Server Shell: gating de plano + sidebar + filtros globais
├── page.tsx                                    # Server: redirect → ./overview
├── _config/
│   └── report-sections.ts                      # Array central que dirige sidebar, breadcrumb e RBAC
├── _components/
│   ├── reports-sidebar.tsx                     # Client: shadcn Sidebar config-driven
│   ├── reports-sidebar-item.tsx                # Client: item individual (active state via pathname)
│   ├── reports-global-filters.tsx              # Client: DateRangePicker + Assignee (elevated) via nuqs
│   ├── reports-plan-gate.tsx                   # Server: bloqueia render se plan < Essential, mostra CTA
│   ├── reports-section-header.tsx              # Server: título + subtítulo + breadcrumb da seção
│   ├── reports-attribution-badge.tsx           # Client: badge "First touch" | "Last touch" | "Per-deal"
│   └── reports-drill-down-sheet.tsx            # Client: Sheet shadcn reusável p/ drill-down de KPI
├── _hooks/
│   └── use-drill-down-state.ts                 # Client: nuqs para drillKpi=<id> + drillPage=<n>
├── overview/
│   ├── page.tsx                                # Fase 2
│   └── _components/
│       ├── overview-kpi-grid.tsx
│       ├── overview-anchor-metric.tsx          # Métrica âncora (canal → conversão → receita)
│       ├── overview-anchor-table.tsx
│       └── overview-goals-strip.tsx            # Faixa de GoalProgressCard scope=ORG
├── pipeline/
│   ├── page.tsx                                # Fase 3 (simplificado — sem DealStageHistory)
│   └── _components/
│       ├── pipeline-funnel-card.tsx
│       ├── pipeline-velocity-card.tsx          # NOVO — velocidade com proxy updatedAt
│       ├── pipeline-deals-at-risk-card.tsx
│       └── pipeline-goals-strip.tsx            # GoalProgressCard scope=PIPELINE
├── team/
│   ├── page.tsx                                # Fase 7 — requiresElevated (UI "Em breve" enquanto não implementado)
│   └── _components/
│       ├── team-ranking-table.tsx
│       ├── team-member-drawer.tsx              # Drill por membro
│       └── team-goals-strip.tsx                # GoalProgressCard scope=MEMBER
├── products/
│   ├── page.tsx                                # Fase 8 (UI "Em breve" enquanto não implementado)
│   └── _components/
│       ├── product-mix-card.tsx
│       ├── revenue-by-product-card.tsx
│       └── top-products-table.tsx
├── lost-deals/
│   ├── page.tsx                                # Fase 4
│   └── _components/
│       ├── lost-by-stage-card.tsx
│       └── lost-by-reason-card.tsx
├── inbox/
│   ├── page.tsx                                # Fase 5 (adapta dashboard atual)
│   └── _components/
│       └── (reaproveita componentes do dashboard — ver §3)
└── ai/
    ├── page.tsx                                # Fase 6 (adapta dashboard atual)
    └── _components/
        └── (reaproveita componentes do dashboard — ver §3)
```

```
app/_data-access/reports/
├── shared/
│   ├── reports-cache.ts                        # makeReportsCacheKey helper
│   ├── reports-filters.ts                      # ReportsFilters DTO + parseReportsSearchParams
│   ├── build-reports-where.ts                  # WHERE base (RBAC + dateRange + assignee + pipeline)
│   └── reports-types.ts                        # DTOs compartilhados
├── overview/
│   ├── get-channel-attribution.ts              # NOVA — métrica âncora first touch
│   └── get-channel-attribution-rows.ts         # NOVA — drill-down: contatos por canal
├── pipeline/
│   ├── get-stage-timings.ts                    # DEFERIDO — requer DealStageHistory migration (ver Open Decision 1)
│   ├── get-pipeline-velocity.ts                # NOVA — Fase 3 simplificada, proxy updatedAt
│   └── get-deals-at-risk.ts                    # NOVA — Fase 3, filtra por inactiveDays via updatedAt
├── team/
│   ├── get-team-performance.ts                 # NOVA — Fase 7
│   └── get-team-member-detail.ts               # NOVA — Fase 7, drill por membro
├── products/
│   ├── get-product-mix.ts                      # NOVA — Fase 8
│   ├── get-revenue-by-product.ts               # NOVA — Fase 8
│   └── get-top-products.ts                     # NOVA — Fase 8
├── lost-deals/
│   └── get-lost-deals-analysis.ts              # NOVA — Fase 4, distribuição por stage + reason
├── inbox/
│   └── get-*-for-reports.ts                    # 7 wrappers tag-only — Fase 5 (ver §5.6)
└── ai/
    └── get-ai-metrics-for-reports.ts           # wrapper tag-only — Fase 6 (ver §5.6)
```

> **Não move `app/_data-access/dashboard/`.** Queries existentes seguem servindo o `/dashboard` operacional. Reports cria wrappers/adaptadores quando precisa do mesmo número mas com shape diferente (ex: `getKpiMetrics` é reaproveitada em `/reports/overview`).

---

## 2. Config Central — `report-sections.ts`

A sidebar é dirigida 100% por este array. Adicionar relatório = adicionar entrada + criar `<slug>/page.tsx`. Sem mexer no shell.

```ts
// app/(authenticated)/org/[orgSlug]/(main)/reports/_config/report-sections.ts
import type { LucideIcon } from 'lucide-react'
import {
  Compass,
  GitBranch,
  Users,
  Package,
  XCircle,
  Inbox,
  Sparkles,
} from 'lucide-react'

export interface ReportSection {
  slug: string                  // segmento de URL (`overview`, `pipeline`, …)
  label: string                 // PT-BR — usado na sidebar e breadcrumb
  description: string           // PT-BR — usado no header de cada seção
  icon: LucideIcon
  requiresElevated?: boolean    // se true: oculta da sidebar para MEMBER + redireciona se acessado via URL
}

export const REPORT_SECTIONS: readonly ReportSection[] = [
  {
    slug: 'overview',
    label: 'Visão geral',
    description: 'KPIs consolidados, métrica âncora e progresso das metas da organização.',
    icon: Compass,
  },
  {
    slug: 'pipeline',
    label: 'Pipeline',
    description: 'Funil de conversão, velocidade e deals em risco.',
    icon: GitBranch,
  },
  {
    slug: 'team',
    label: 'Time',
    description: 'Performance por vendedor e progresso das metas individuais.',
    icon: Users,
    requiresElevated: true,
  },
  {
    slug: 'products',
    label: 'Produtos',
    description: 'Mix de vendas e receita por produto.',
    icon: Package,
  },
  {
    slug: 'lost-deals',
    label: 'Perdas',
    description: 'Distribuição de perdas por estágio e motivo.',
    icon: XCircle,
  },
  {
    slug: 'inbox',
    label: 'Inbox',
    description: 'Volume de conversas, canais, performance da equipe e IA.',
    icon: Inbox,
  },
  {
    slug: 'ai',
    label: 'IA',
    description: 'Consumo de créditos, execuções por agente e plano.',
    icon: Sparkles,
  },
] as const

export type ReportSlug = (typeof REPORT_SECTIONS)[number]['slug']

export function findReportSection(slug: string): ReportSection | undefined {
  return REPORT_SECTIONS.find((section) => section.slug === slug)
}
```

> **Decisão travada:** o nome do array é `REPORT_SECTIONS` (singular `REPORT_`, plural `_SECTIONS`). Importar como `import { REPORT_SECTIONS } from '../_config/report-sections'`.

---

## 3. Mapa de Reaproveitamento — Dashboard atual → Reports

Reports **não é** o dashboard renomeado. Componentes do dashboard são classificados em:

| Componente atual (`/dashboard/_components/`) | Destino em `/reports` | Ação |
|---|---|---|
| `dashboard-tabs.tsx` | — | ❌ **Descartado** — sidebar substitui tabs em reports |
| `date-range-picker.tsx` | `reports-global-filters.tsx` | ✅ **Reusa diretamente** (já é shadcn-based) |
| `dashboard-filters-bar.tsx` | `pipeline/_components/pipeline-filters.tsx` | 🟡 **Inspira mas reescreve** — em reports os filtros são locais por seção; o shell global tem só DateRange + Assignee |
| `inbox-dashboard-filters-bar.tsx` | `inbox/_components/inbox-filters.tsx` | 🟡 **Adapta** — remove o que já vive no shell global |
| `kpi-card.tsx` | reusa via import | ✅ **Reusa diretamente** |
| `kpi-grid.tsx` | `overview/_components/overview-kpi-grid.tsx` | 🟡 **Inspira mas reescreve** — em reports cada KPI é clicável (abre drill Sheet) |
| `pipeline-status-section.tsx` + `pipeline-donut-chart.tsx` | `pipeline/_components/pipeline-status-card.tsx` | 🟡 **Adapta** — passa a respeitar drill-down |
| `funnel-section.tsx` + `pipeline-funnel.tsx` | `pipeline/_components/pipeline-funnel-card.tsx` | 🟡 **Adapta** — renderiza tempo médio por estágio ao lado |
| `revenue-area-chart.tsx` + `charts-section.tsx` | `overview/_components/overview-revenue-chart.tsx` | ✅ **Reusa via wrapper** — mesma query (`getRevenueOverTime`), card com header diferente |
| `task-list-section.tsx`, `recent-activity-section.tsx` | — | ❌ **Não migra** — pertence a "o que fazer hoje", não a "como estamos indo" |
| `inbox-kpi-grid.tsx` + `inbox-volume-chart.tsx` + `inbox-channel-donut-chart.tsx` + `inbox-heatmap-grid.tsx` + `inbox-top-labels-section.tsx` + `inbox-ai-human-chart.tsx` + `inbox-attendant-chart.tsx` | `inbox/_components/*` | ✅ **Reusa diretamente** — Inbox é a seção mais "operacional" do reports; o redesign é cosmético (header da seção, sem tabs) |
| `ai-dashboard-section.tsx` + `ai-kpi-grid.tsx` + `ai-usage-bar-chart.tsx` + `ai-agent-breakdown-card.tsx` + `ai-plan-usage-card.tsx` | `ai/_components/*` | ✅ **Reusa diretamente** — idem inbox |
| `skeletons.tsx` | `_components/skeletons.tsx` (novo) | 🟡 **Inspira** — cria conjunto próprio em reports (formato é diferente — sem grid de tabs) |

**Princípio:** se a query e o número são iguais, reusa. Se o card precisa virar clicável (drill-down), ganha header diferente ou contextualiza meta, então **adapta** — wrappers em `/reports/<section>/_components/` que importam o componente base do dashboard ou reescrevem onde a diferença é estrutural.

---

## 4. Padrões Transversais

### 4.1. Filtros globais vs locais

| Filtro | Onde mora | Parser nuqs | Notas |
|---|---|---|---|
| `start` / `end` (DateRange) | `layout.tsx` (global) | `parseAsString`, `shallow: false` | Reusa `parseDateRange` de `app/_utils/date-range.ts` |
| `assignee` (apenas `elevated`) | `layout.tsx` (global) | `parseAsString`, `shallow: false` | Server-side: ignora se `!elevated` (mesmo padrão atual do dashboard) |
| `pipelineId` | `pipeline`, `lost-deals`, `products` | local na page | Algumas seções precisam, outras não — não poluir o shell |
| `status[]`, `priority[]`, `productId`, `inactiveDays` | `pipeline` (e `lost-deals`) | local | mesmos parsers do `DashboardFiltersBar` atual |
| `attributionModel` | `overview` (e `products` se for olhar por canal) | local: `parseAsStringEnum(['first', 'last', 'per_deal'])` default `'first'` | Toggle no card da métrica âncora |
| `channel`, `labelId`, `inboxStatus`, `aiVsHuman` | `inbox` | local | mesmos parsers do dashboard atual |
| `drillKpi`, `drillPage`, `drillSize` | qualquer seção | local em `_hooks/use-drill-down-state.ts` | controla abertura do Sheet de drill-down |

**Regra:** o shell **nunca** sabe sobre filtros locais — `searchParams` é tipado como `Record<string, string \| undefined>` e cada page pega o que precisa. Isso evita acoplamento entre seções.

### 4.2. Comparação de período (obrigatória em todo KPI)

Todo card de KPI exibe delta vs período anterior (`+12% vs período anterior`). Já existe a infraestrutura:
- `getPreviousPeriod(dateRange)` em `app/_utils/date-range.ts`.
- `getKpiMetrics` já retorna `prev*` para os 4 KPIs base.
- `formatVariation(current, previous)` em `app/_utils/date-range.ts`.

**Toda query nova** abaixo segue o mesmo padrão: retorna `{ current: number, previous: number }` por métrica, ou um shape equivalente. **Sem exceções.**

### 4.3. Drill-down via Sheet

Clicar em qualquer KPI ou segmento de gráfico abre `Sheet` shadcn lateral (lado direito, `side="right"`, `className="w-full sm:max-w-2xl"`) com a lista paginada dos registros que compõem o número.

**Mecânica:**
- Cada card de KPI clicável envolve `<button onClick>` (ou `<a>` quando faz mais sentido — early return decide).
- `useDrillDownState` controla `drillKpi` (qual KPI está aberto) e `drillPage` via nuqs (URL-linkável).
- `ReportsDrillDownSheet` lê esse state e despacha para a query certa por `drillKpi`. Cada KPI tem seu próprio data-access dedicado (`get-channel-attribution-rows.ts`, `get-deals-at-risk-rows.ts`, etc.) — Sheet é uma casca, queries são por KPI.
- **Paginação simples (page-based).** Não infinite scroll. Tamanho fixo (`DRILL_PAGE_SIZE = 20`).

**Server Component dentro do Sheet:** o conteúdo do Sheet é renderizado por um Server Component dentro de `<Suspense>` — quando `drillKpi` muda, o cliente força navegação shallow para incluir a chave na URL e o Server Component re-renderiza com os dados frescos. Padrão idêntico ao do `dashboard-filters-bar` (`shallow: false`).

> **Decisão arquitetural:** drill-down em **Sheet** (não rota dedicada). Mantém a URL linkável (com `?drillKpi=anchor-channel:WHATSAPP`) sem fragmentar a navegação principal.

### 4.4. Cache & RBAC

- **Tag única global:** `reports:${orgId}` para todas as queries de reports. Mutações cross-domain (lifecycle, deals, contatos) que afetam reports invalidam essa tag **adicionalmente** às suas tags próprias (já é o padrão — ver `getKpiMetrics` que tem `[dashboard:${orgId}, deals:${orgId}]`; o equivalente em reports será `[reports:${orgId}, deals:${orgId}]`).
- **TTL padrão:** 3600s nas queries de reports (mesma cadência das queries do dashboard). Reports é analítico, não operacional — staleness de até 1h é aceitável.
- **Granularidade:** começamos com tag global `reports:${orgId}`. Granular (`reports:${orgId}:overview`, `reports:${orgId}:team`, etc.) só se invalidação ficar ruidosa em produção (mesma orientação do PLAN-goals).
- **RBAC** aplicada via `buildReportsWhere`:
  ```ts
  ...(elevated && filters.assignee
    ? { assignedTo: filters.assignee }
    : elevated
      ? {}
      : { assignedTo: userId })
  ```
  MEMBER nunca vê dado fora da sua atribuição. Seções `requiresElevated` redirecionam server-side antes de render.
- **Cache keys** seguem o padrão de `getKpiMetrics`: incluem `orgId`, `userId`, `elevated`, ISO das datas e um `filtersKey` (JSON.stringify ordenado dos filtros). Helper único em `app/_data-access/reports/shared/reports-cache.ts`.

```ts
export function makeReportsCacheKey(
  scope: string,
  ctx: RBACContext,
  dateRange: DateRange,
  extra: Record<string, unknown> = {},
): string[] {
  const elevated = isElevated(ctx.userRole)
  const extraKey = JSON.stringify(extra, Object.keys(extra).sort())
  return [
    `reports-${scope}-${ctx.orgId}-${ctx.userId}-${elevated}-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}-${extraKey}`,
  ]
}
```

### 4.5. Plano gating

`/reports` é gated em **Essential+** (Light não acessa). Decisão de produto travada.

**Onde gating é aplicado:**
- `layout.tsx`: server-side guard. Se `getEffectivePlan(orgId)?.slug === 'light'` → render `<ReportsPlanGate />` (CTA de upgrade que ocupa a tela toda, sem renderizar o `{children}`). Não usar `redirect` — queremos a CTA in-place.
- Sidebar principal (`app/(authenticated)/org/[orgSlug]/(main)/_components/...`): item "Relatórios" continua **visível** mesmo no Light — clicar leva à página com CTA de upgrade. UX consistente com `/copilot`.

```tsx
// reports-plan-gate.tsx (esqueleto)
export async function ReportsPlanGate({ orgId }: { orgId: string }) {
  const plan = await getEffectivePlan(orgId)
  if (!plan || plan.slug === 'light') {
    return <UpgradeCta currentPlan={plan?.slug ?? null} requiredPlan="essential" feature="Relatórios" />
  }
  return null
}
```

> **Decisão arquitetural:** o `ReportsPlanGate` é **Server Component**. Não usa hook nem context — chama `getEffectivePlan` direto (`unstable_cache` já cuida da economia de DB roundtrip). O `UpgradeCta` é client (tem botão para `/checkout/configure?plan=essential`).

### 4.6. Modelo de atribuição rotulado

Toda métrica baseada em atribuição (`first touch`, `last touch`, `per-deal`) **deve carregar** `<ReportsAttributionBadge model={...} />` no header do card. Padrão visual: `Badge` shadcn variant `outline`, label `First touch` / `Last touch` / `Per deal`, tooltip explicando o significado.

Default por seção:
- `/overview` — métrica âncora padrão `first touch` (com toggle local `attributionModel`).
- `/products` — métrica por canal sempre `last touch` (qual canal fechou aquela venda).
- `/team` — não usa atribuição (ranking por vendedor não depende de canal).

### 4.7. UI/UX — shadcn-first, sem exceção

- **O projeto já tem seu próprio sistema de sidebar** (`AppSidebar`, `SidebarContent`, `SidebarItem`, `useSidebar` em `@/_providers/sidebar-provider`). **Não instalar** o componente shadcn `Sidebar` — causaria conflito de nomes com `@/_components/layout/sidebar-content.tsx` já existente. A `ReportsSidebar` (nav secundária de seções dentro de `/reports`) é um `<nav>` simples com `Link` e estado ativo via `usePathname` — sem `useSidebar` do app (que controla colapso do sidebar principal).
- `Sheet`, `Card`, `Badge`, `Button`, `Tabs`, `Tooltip`, `DropdownMenu`, `Progress`, `Select`, `Command`, `Popover`, `Skeleton`, `Form`, `FormField` etc. — **já existem**, reusar sempre.
- **`FormLabel` SEMPRE dentro de `FormField`** (memória global do projeto). Em filtros que não usam React Hook Form (caso de filtros via nuqs), usar `<Label>` direto.
- **Skeletons via `<Suspense>`** por bloco — cada seção define seus próprios skeletons em `_components/skeletons.tsx` da seção (mesmo padrão do dashboard atual).
- **`useEffect`** apenas para sincronização com sistema externo — nunca para reagir a mudança de filtro (nuqs já cuida via re-render).

---

## 5. Seções MVP — Contratos das Queries Novas

Cada query nova segue o template canônico:

```ts
// 1. fetch puro (sem cache, recebe primitives)
async function fetchX(orgId, userId, elevated, dateRange, prevRange, filters): Promise<XDto> { … }

// 2. wrapper com cache + RBAC
export const getX = cache(async (ctx, dateRange, filters): Promise<XDto> => {
  const elevated = isElevated(ctx.userRole)
  const prevRange = getPreviousPeriod(dateRange)
  const getCached = unstable_cache(
    async () => fetchX(ctx.orgId, ctx.userId, elevated, dateRange, prevRange, filters),
    makeReportsCacheKey('x', ctx, dateRange, filters),
    { tags: [`reports:${ctx.orgId}`, `deals:${ctx.orgId}`], revalidate: 3600 },
  )
  return getCached()
})
```

### 5.1. `/reports/overview`

#### Reusa
- `getKpiMetrics` (com adapter wrapper para usar tag `reports:` — ver §6.3).
- `getRevenueOverTime` (idem).

#### Novo: `getChannelAttribution`

**Arquivo:** `app/_data-access/reports/overview/get-channel-attribution.ts`.

**Propósito:** métrica âncora — para cada canal, devolver leads, clientes, taxa de conversão e receita.

```ts
export interface ChannelAttributionRow {
  channel: CaptureChannel
  leadsCount: number
  customersCount: number
  conversionRate: number       // 0-100
  revenue: number
  // Período anterior
  prevLeadsCount: number
  prevCustomersCount: number
  prevConversionRate: number
  prevRevenue: number
}

export interface ChannelAttributionDto {
  model: 'first' | 'last' | 'per_deal'
  rows: ChannelAttributionRow[]
  // Totais para a "linha total" no rodapé da tabela
  totalLeads: number
  totalCustomers: number
  totalRevenue: number
}

export async function getChannelAttribution(
  ctx: RBACContext,
  dateRange: DateRange,
  options: { model: 'first' | 'last' | 'per_deal'; includeManual: boolean },
): Promise<ChannelAttributionDto>
```

**Lógica por modelo:**

- `first` (default): `COUNT DISTINCT Contact.id` agrupado por `Contact.firstCaptureChannel` com `Contact.firstCaptureAt BETWEEN dateRange`. Clientes = subset que tem ao menos um Deal `status=WON`. Receita = `SUM(Deal.value)` desses Deals.
- `last`: idem mas por `Contact.lastCaptureChannel` / `lastCaptureAt`.
- `per_deal`: junta `Deal` × `DealCaptureEvent (attribution=PRIMARY, removedAt IS NULL)` × `CaptureEvent`, agrupa por `CaptureEvent.channel`, conta deals e soma `Deal.value` para `status=WON`. Leads = `COUNT DISTINCT Contact` no JOIN.

**Filtros:**
- `options.includeManual = false` (default) → `WHERE CaptureEvent.capturedAutomatically = true`. Toggle na UI.
- Sempre exclui registros com `causeType = BACKFILL` (origem sintética para deals legados — ver `PLAN-customer-lifecycle.md` §3.5). Excludir via JOIN com `ContactLifecycleHistory` ou — mais simples — via `WHERE CaptureSource.name != 'Backfill'` (a source default é `'Backfill'` por convenção).

**Cache:** tag `reports:${orgId}`, TTL 3600s. Cache key inclui `model` + `includeManual`.

#### Novo: `getChannelAttributionRows` (drill-down)

**Arquivo:** `app/_data-access/reports/overview/get-channel-attribution-rows.ts`.

```ts
export interface ChannelAttributionDrillRow {
  contactId: string
  contactName: string
  firstCaptureAt: Date
  lastCaptureAt: Date
  hasWonDeal: boolean
  totalRevenue: number
}

export async function getChannelAttributionRows(
  ctx: RBACContext,
  dateRange: DateRange,
  options: { channel: CaptureChannel; model: 'first' | 'last' | 'per_deal'; page: number; pageSize: number },
): Promise<{ rows: ChannelAttributionDrillRow[]; total: number }>
```

Usado pelo `ReportsDrillDownSheet` quando user clica num canal específico da tabela âncora.

#### Goals strip

`<OverviewGoalsStrip />` faz `getGoalsWithProgress(ctx)` e filtra `scope === 'ORG'`. Renderiza um `<GoalProgressCard variant="compact" />` para cada (já implementado em `PLAN-goals.md`). Se nenhuma meta ORG configurada: empty state mínimo com link para `/settings/goals`.

### 5.2. `/reports/pipeline`

#### Reusa
- `getFunnelData` via adapter (tag `reports:`).
- `getDealsByStatus` via adapter.

#### Novo: `getStageTimings`

**Arquivo:** `app/_data-access/reports/pipeline/get-stage-timings.ts`.

**Propósito:** tempo médio que um deal passa em cada estágio antes de avançar. Permite identificar gargalo do pipeline.

```ts
export interface StageTiming {
  stageId: string
  stageName: string
  position: number
  // Tempo médio em ms que deals passam neste estágio antes de SAÍREM dele
  avgTimeInStageMs: number | null
  // Quantidade de deals que entraram neste estágio no período (denominador da média)
  dealsThroughCount: number
  // Período anterior
  prevAvgTimeInStageMs: number | null
  prevDealsThroughCount: number
}

export async function getStageTimings(
  ctx: RBACContext,
  dateRange: DateRange,
  filters: { pipelineId?: string },
): Promise<StageTiming[]>
```

**Cálculo:** usa `DealStageHistory` (já existe — verificar no schema; se não existir, usar `Deal.updatedAt` deltas via `ContactLifecycleHistory` filtrada por `causeType = DEAL_*` é uma **alternativa** mas inferior). Para cada deal que **saiu** de um stage no período, `time_in_stage = exit_timestamp - entry_timestamp`. Média agrupada por `stageId`.

> **Open Decision 1:** confirmar existência da tabela de histórico de stage no `prisma/schema.prisma`. Se não existir, esta query precisa ser deferida (cria histórico via trigger + migration). Verificar antes de iniciar Fase 3. **Hipótese atual:** `DealStageHistory` existe (foi mencionado em PLANs de pipeline anteriores).

#### Novo: `getPipelineVelocity`

**Arquivo:** `app/_data-access/reports/pipeline/get-pipeline-velocity.ts`.

**Propósito:** métrica composta que sintetiza a saúde do pipeline.

```
velocity = (numDeals × winRate × avgTicket) / avgCycleDays
```

```ts
export interface PipelineVelocityDto {
  numDeals: number
  winRate: number         // 0-1
  avgTicket: number
  avgCycleDays: number    // 0 evita divisão por zero — tratamento na UI
  velocity: number        // R$ / dia
  // Período anterior
  prevNumDeals: number
  prevWinRate: number
  prevAvgTicket: number
  prevAvgCycleDays: number
  prevVelocity: number
}

export async function getPipelineVelocity(
  ctx: RBACContext,
  dateRange: DateRange,
  filters: { pipelineId?: string },
): Promise<PipelineVelocityDto>
```

**Lógica:**
- `numDeals` = `COUNT(Deal)` criados no período (com filtro pipelineId opcional).
- `winRate` = `COUNT(Deal WON no período) / numDeals`.
- `avgTicket` = `AVG(Deal.value)` dos `WON` no período.
- `avgCycleDays` = `AVG(closedAt - createdAt)` dos `WON` no período, em dias. Usar `Deal.updatedAt` como proxy de `closedAt` quando o status passou para WON (a fonte canônica é a `DealStageHistory` se existir).
- `velocity` = `(numDeals * winRate * avgTicket) / Math.max(avgCycleDays, 1)`.

Quatro agregações Prisma + uma multiplicação no app layer. Sem raw SQL.

#### Reusa para "Deals em risco"
`getDealsByStatus` ou listagem paginada filtrada por `inactiveDays`. Cria wrapper `getDealsAtRisk(ctx, dateRange, { inactiveDays })` em `app/_data-access/reports/pipeline/get-deals-at-risk.ts` que delega para `db.deal.findMany` com `updatedAt < now - inactiveDays*MS_PER_DAY`. Drill-down já vem aqui — clicar no card abre Sheet com lista.

#### Goals strip
`<PipelineGoalsStrip pipelineId={…} />` filtra `getGoalsWithProgress(ctx)` por `scope === 'PIPELINE' && targetPipelineId === filters.pipelineId`. Se `filters.pipelineId` é null (todos os pipelines), mostra todos os goals PIPELINE da org.

### 5.3. `/reports/team`

**`requiresElevated: true`** — sidebar oculta para MEMBER; layout server-side faz `redirect('/org/${orgSlug}/reports/overview')` se MEMBER tentar acessar via URL.

> **Action client se houver mutação na seção:** mesmo aqui usamos `orgActionClient` (não há client "elevated-only"). A UI esconde de MEMBER, mas qualquer mutação acaba revalidando RBAC dentro da action via `canPerformAction`. **Nunca** `freeOrgActionClient` aqui — Team é entidade de negócio.

#### Novo: `getTeamPerformance`

**Arquivo:** `app/_data-access/reports/team/get-team-performance.ts`.

```ts
export interface TeamMemberPerformance {
  userId: string
  fullName: string
  avatarUrl: string | null
  dealsWonCount: number
  revenue: number
  avgTicket: number
  conversionRate: number       // 0-100: dealsWon / dealsOpened no período
  // Período anterior
  prevDealsWonCount: number
  prevRevenue: number
  prevAvgTicket: number
  prevConversionRate: number
}

export async function getTeamPerformance(
  ctx: RBACContext,
  dateRange: DateRange,
): Promise<TeamMemberPerformance[]>
```

**Lógica:** `db.deal.groupBy({ by: ['assignedTo'], _count, _sum: { value }, _avg: { value }, where: { ... } })` para deals com `status=WON` no período. Cruza com `Member.role IN ('OWNER','ADMIN','MEMBER')` para popular nome/avatar (descarta SUPPORT). Conversão = WON / Opened (uma query a mais agrupada por mesmo `assignedTo` sem filtro de status mas com `createdAt BETWEEN dateRange`). Ordena por `revenue` desc.

#### Novo: `getTeamMemberDetail` (drill por membro)

Mesmo shape de `getKpiMetrics` mas filtrado por `assignedTo = memberId`. Reusa internamente `getKpiMetrics` passando `filters.assignee = memberId`. Não cria nova query — wrapper sintático.

#### Goals strip
`<TeamGoalsStrip />` filtra `getGoalsWithProgress(ctx)` por `scope === 'MEMBER'`. Como `getGoals` já filtra RBAC (MEMBER só vê suas próprias METER), e essa seção é elevated-only, vê todas as metas MEMBER da org.

### 5.4. `/reports/products`

#### Novo: `getProductMix`

```ts
export interface ProductMixRow {
  productId: string
  productName: string
  unitsSold: number
  revenue: number
  // % do total de receita
  share: number              // 0-100
  prevUnitsSold: number
  prevRevenue: number
  prevShare: number
}

export async function getProductMix(
  ctx: RBACContext,
  dateRange: DateRange,
  filters: { pipelineId?: string },
): Promise<ProductMixRow[]>
```

**Lógica:** agrega `DealLineItem` (não `DealProduct` — legacy congelada por `PLAN-customer-lifecycle.md` §3.8) com `itemType = PRODUCT` cujo Deal pai tem `status = WON` e `updatedAt BETWEEN dateRange`. Soma `quantity` e `(unitPrice × quantity − desconto)`. Share é o ratio da receita do produto sobre o total.

#### Novo: `getRevenueByProduct`

Variante temporal — receita por produto por mês/dia (depende do tamanho do dateRange). Reusa internamente o mesmo agregado de `getProductMix` mas agrupado adicionalmente por `DATE_TRUNC(month, Deal.updatedAt)`.

#### Novo: `getTopProducts`

```ts
export async function getTopProducts(
  ctx: RBACContext,
  dateRange: DateRange,
  options: { metric: 'revenue' | 'units'; limit: number },
): Promise<ProductMixRow[]>
```

Wrapper sobre `getProductMix` que ordena por métrica escolhida e retorna top N. Não cria query nova — só `slice` e `sort` no app layer.

### 5.5. `/reports/lost-deals`

#### Novo: `getLostDealsAnalysis`

```ts
export interface LostDealsByStage {
  stageId: string
  stageName: string
  position: number
  count: number
  value: number
  prevCount: number
  prevValue: number
}

export interface LostDealsByReason {
  reasonId: string
  reasonLabel: string
  count: number
  value: number
  prevCount: number
  prevValue: number
}

export interface LostDealsAnalysisDto {
  byStage: LostDealsByStage[]
  byReason: LostDealsByReason[]
  totalLost: number
  totalLostValue: number
  prevTotalLost: number
  prevTotalLostValue: number
}

export async function getLostDealsAnalysis(
  ctx: RBACContext,
  dateRange: DateRange,
  filters: { pipelineId?: string },
): Promise<LostDealsAnalysisDto>
```

**Lógica:** dois `groupBy` paralelos em `db.deal` com `status = LOST` e `updatedAt BETWEEN dateRange` — um por `pipelineStageId`, outro por `lossReasonId`. JOINs para popular nomes via `include`.

### 5.6. `/reports/inbox` e `/reports/ai`

**Sem novas queries.** Reaproveita as 8 queries já existentes em `app/_data-access/dashboard/get-*` (inbox: KPI, volume, channel, heatmap, top labels, AI-vs-human, attendant performance; AI: `getAiMetrics`). Cada query ganha um wrapper em `app/_data-access/reports/inbox/` e `app/_data-access/reports/ai/` que **apenas troca a tag de cache** — em vez de `dashboard:${orgId}` ou `conversations:${orgId}`, usa `reports:${orgId}` adicionalmente. Wrapper trivial:

```ts
// app/_data-access/reports/inbox/get-inbox-kpi-metrics.ts
export const getInboxKpiMetricsForReports = cache(
  async (ctx, dateRange, filters) => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () => fetchInboxKpiMetricsRaw(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      makeReportsCacheKey('inbox-kpi', ctx, dateRange, filters),
      { tags: [`reports:${ctx.orgId}`, `conversations:${ctx.orgId}`], revalidate: 3600 },
    )
    return getCached()
  }
)
```

> **Por que duplicar wrapper em vez de reusar `getInboxKpiMetrics` diretamente?** A função existente usa cache key e tag específica do dashboard. Reusar funcionaria, mas:
> 1. Mistura tags entre superfícies (mutação em reports invalidaria cache do dashboard e vice-versa — invalidações ruidosas).
> 2. Não permite TTLs diferentes se quisermos no futuro.
> 3. O preço é baixo: wrapper de 8 linhas por query.
>
> **Decisão:** **duplicar wrappers** (caminho 1). Manter `fetchInboxKpiMetricsRaw` como função pura compartilhada exportada do módulo do dashboard (refator pequeno: extrair a função `fetch*` existente para um arquivo `_internal/` exportável). Isso evita duplicação de lógica de query mantendo independência de cache.

> **Open Decision 2:** o refator de "extrair `fetch*` para `_internal/`" pode ser pesado se feito em todas as 8 queries de uma vez. Alternativa: fazer só nas queries que reusamos e deixar `getX` original como-está. Decidir caso-a-caso na Fase 7/8.

---

## 6. Shell — Detalhamento da Fase 1

### 6.1. `layout.tsx`

```tsx
// app/(authenticated)/org/[orgSlug]/(main)/reports/layout.tsx
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { isElevated } from '@/_lib/rbac'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { ReportsSidebar } from './_components/reports-sidebar'
import { ReportsGlobalFilters } from './_components/reports-global-filters'
import { ReportsPlanGate } from './_components/reports-plan-gate'

interface ReportsLayoutProps {
  params: Promise<{ orgSlug: string }>
  children: React.ReactNode
}

export default async function ReportsLayout({ params, children }: ReportsLayoutProps) {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const { plan } = await getPlanLimits(ctx.orgId)
  if (!plan || plan === 'light') {
    return <ReportsPlanGate currentPlan={plan ?? null} />
  }

  const elevated = isElevated(ctx.userRole)
  // Membros só são necessários para o AssigneeFilter, visível apenas para roles elevated.
  const membersData = elevated ? await getOrganizationMembers(ctx.orgId) : null
  const members = membersData?.accepted.map((m) => ({
    userId: m.userId ?? '',
    fullName: m.user?.fullName ?? m.email,
  })) ?? null

  return (
    <div className="flex h-full">
      <ReportsSidebar userRole={ctx.userRole} orgSlug={orgSlug} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <ReportsGlobalFilters isElevated={elevated} members={members} />
        {children}
      </div>
    </div>
  )
}
```

> **Decisão:** `ReportsGlobalFilters` é client (precisa de `useQueryStates` do nuqs). Recebe `isElevated` + `members` como props — o fetch de membros é condicional no layout server-side (só para elevated), evitando query desnecessária para MEMBER.

### 6.2. `reports-sidebar.tsx`

**Não usa shadcn Sidebar** — o projeto tem sistema de sidebar próprio (`AppSidebar`, `useSidebar`, `SidebarItem`). A nav secundária de reports é um `<nav>` simples com active state via `usePathname`. Não usa `useSidebar` (que controla colapso do sidebar principal da aplicação).

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/_lib/utils'
import { isElevated } from '@/_lib/rbac'
import { REPORT_SECTIONS } from '../_config/report-sections'
import type { MemberRole } from '@prisma/client'

interface ReportsSidebarProps {
  userRole: MemberRole
  orgSlug: string
}

export function ReportsSidebar({ userRole, orgSlug }: ReportsSidebarProps) {
  const pathname = usePathname()
  const elevated = isElevated(userRole)

  return (
    <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border/50 bg-sidebar p-3 md:flex">
      {REPORT_SECTIONS.map((section) => {
        if (section.requiresElevated && !elevated) return null
        const href = `/org/${orgSlug}/reports/${section.slug}`
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={section.slug}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
            )}
          >
            <section.icon className="h-4 w-4 shrink-0" />
            <span>{section.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

> **Padrão visual:** alinhado com `SidebarItem` do app — `hover:bg-primary/10`, `text-primary` ativo, `text-muted-foreground` inativo. A largura fixa `w-52` (208px) complementa o sidebar principal colapsável sem conflitar.

### 6.3. `reports-global-filters.tsx`

```tsx
'use client'
import { parseAsString, useQueryStates } from 'nuqs'
import { DateRangePicker } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/date-range-picker'
import { AssigneeFilter } from './assignee-filter'  // extraído do dashboard-filters-bar (apenas o trecho de assignee)

const reportsGlobalParsers = {
  start: parseAsString.withOptions({ shallow: false }),
  end: parseAsString.withOptions({ shallow: false }),
  assignee: parseAsString.withOptions({ shallow: false }),
}

interface MemberOption {
  userId: string
  fullName: string
}

interface ReportsGlobalFiltersProps {
  isElevated: boolean
  members: MemberOption[] | null   // null quando MEMBER (não elevated) — filtro de assignee não renderiza
}

export function ReportsGlobalFilters({ isElevated, members }: ReportsGlobalFiltersProps) {
  const [filters, setFilters] = useQueryStates(reportsGlobalParsers)

  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-4">
      <DateRangePicker />
      {isElevated && members ? (
        <AssigneeFilter members={members} value={filters.assignee} onChange={(value) => setFilters({ assignee: value })} />
      ) : null}
    </div>
  )
}
```

> **Decisão:** o `DateRangePicker` atual já lê/escreve `start` e `end` via nuqs internamente. Reusa diretamente — não precisa wrapper.
> **`AssigneeFilter`:** extrair como componente próprio do `dashboard-filters-bar.tsx` (refator pequeno em `/dashboard/_components/`). Sem isso, este filtro fica acoplado ao dashboard. Tarefa de Fase 1 (item 0).

### 6.4. `page.tsx` (raiz)

```tsx
// app/(authenticated)/org/[orgSlug]/(main)/reports/page.tsx
import { redirect } from 'next/navigation'

export default async function ReportsRootPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/reports/overview`)
}
```

### 6.5. Adapter para queries reusadas (`reports:` tag)

Para queries existentes do dashboard que reusamos (`getKpiMetrics`, `getRevenueOverTime`, `getFunnelData`, `getDealsByStatus`, e as 8 do inbox/ai), criamos wrappers em `app/_data-access/reports/` que reaplicam `unstable_cache` com tag `reports:${orgId}`. Padrão idêntico ao §5.6 (`getInboxKpiMetricsForReports`).

> **Tarefa de Fase 1:** decidir se o `fetch*` interno (a função pura) é extraída para módulo compartilhado **agora** ou **caso-a-caso** nas fases subsequentes. Recomendação: caso-a-caso, evita refator grande no shell.

### 6.6. Entrada no sidebar principal

Adicionar item "Relatórios" ao sidebar principal (`app/(authenticated)/org/[orgSlug]/(main)/_components/...`). Posição: depois de "Dashboard", antes de "Copiloto". Ícone: `BarChart3` (lucide). Visível para **todos os roles** — gating é feito dentro do `/reports`, não na visibilidade do item (UX consistente com `/copilot`).

---

## 7. Fases de Implementação

Cada fase é shippable isoladamente (entrega valor sozinha + não quebra nada existente).

### Fase 1 — Shell ✅ CONCLUÍDA

**Entrega:** rota `/reports` acessível, sidebar funcional, filtros globais, gating de plano, redirect raiz → `/overview`, página `/overview` mínima (placeholder).

**Commits:** `76ed8c9` (data-access shared) + `0417b97` (shell UI/config/hooks).

### Fase 2 — Overview ✅ CONCLUÍDA

**Commits:** `cef4b99` (data-access) + `e6d6dc3` (UI) + `c3fcf8a` (fix cache wrappers).

**Observação:** `DrillDownSheet` implementado como shell — body é placeholder "Em breve" até as queries de drill-down serem implementadas (Open Decision 9).

### Fase 3 — Pipeline (Simplificado) ✅ CONCLUÍDA

**Commits:** `cef4b99` + `e6d6dc3`.

**Observação:** sem `pipeline-stage-timings-card.tsx` — aguarda `DealStageHistory` migration (Open Decision 1).

### Fase 4 — Lost Deals ✅ CONCLUÍDA

**Commits:** `cef4b99` + `e6d6dc3`.

### Fase 5 — Inbox ✅ CONCLUÍDA

**Commits:** `cef4b99` + `e6d6dc3`.

**Observação:** os 7 wrappers `get-*-for-reports.ts` existem mas os componentes do dashboard são self-contained e chamam suas próprias queries internamente (tag `conversations:${orgId}`). Cache independente `reports:${orgId}` para inbox fica para Open Decision 2.

### Fase 6 — AI ✅ CONCLUÍDA

**Commits:** `cef4b99` + `e6d6dc3`.

**Observação:** `AiDashboardSection` reutilizada diretamente — mesma situação de cache que Inbox (Open Decision 2).

### Fase 7 — Team (`requiresElevated`)

**Entrega:** `/reports/team` — ranking, drawer por membro, metas por membro.

> **UI:** enquanto não implementada, `team/page.tsx` renderiza placeholder "Em breve" em vez de redirect.

**Arquivos:**
- `team/page.tsx` (com server-side redirect se MEMBER; placeholder "Em breve" até implementação)
- `team/_components/team-ranking-table.tsx`
- `team/_components/team-member-drawer.tsx`
- `team/_components/team-goals-strip.tsx`
- `app/_data-access/reports/team/get-team-performance.ts` (NOVO)
- `app/_data-access/reports/team/get-team-member-detail.ts` (wrapper sobre getKpiMetrics)

**Dependências:** Fase 2 entregue.

### Fase 8 — Products

**Entrega:** `/reports/products` — mix, receita por produto, top N.

> **UI:** enquanto não implementada, `products/page.tsx` renderiza placeholder "Em breve".

**Arquivos:**
- `products/page.tsx`
- `products/_components/product-mix-card.tsx`
- `products/_components/revenue-by-product-card.tsx`
- `products/_components/top-products-table.tsx`
- `app/_data-access/reports/products/get-product-mix.ts` (NOVO)
- `app/_data-access/reports/products/get-revenue-by-product.ts` (NOVO)
- `app/_data-access/reports/products/get-top-products.ts` (NOVO)

**Dependências:** Fase 2 entregue.

---

## 8. Critérios de Aceite Arquiteturais

### Shell
- [x] `REPORT_SECTIONS` é a única fonte de verdade do menu — adicionar/remover seção é editar apenas o array + criar a `page.tsx`. Zero edição em `reports-sidebar.tsx`.
- [x] `requiresElevated: true` esconde da sidebar **e** redireciona server-side (defesa em profundidade).
- [x] `/reports` para Light renderiza `<ReportsPlanGate />` (sem `redirect`).
- [x] DateRange e Assignee persistem em URL via nuqs `shallow: false`. Recarregar a página mantém os filtros.
- [x] Item "Relatórios" no sidebar principal é visível para todos os roles e planos — gating fica dentro do `/reports`.
- [x] `ReportsSidebar` usa `<nav>` simples (não shadcn Sidebar) — sem conflito com o sistema de sidebar existente do app.
- [x] `AssigneeFilter` extraído do dashboard como componente próprio reaproveitável (sem duplicação).
- [x] `layout.tsx` busca `getOrganizationMembers` condicionalmente (apenas se `elevated`) e passa `members` para `ReportsGlobalFilters`.

### Data-access
- [x] Tag única `reports:${orgId}` em todas as queries de reports (mais tags adicionais conforme entidade — `deals:`, `conversations:`, etc.).
- [x] Cache key construída via `makeReportsCacheKey` — zero strings hardcoded.
- [x] TTL padrão 3600s.
- [x] RBAC server-side via `buildReportsWhere` (não confiar em filtros do client). MEMBER **nunca** vê dado fora da sua atribuição.
- [x] Toda query nova exporta `prev*` por campo (comparação de período obrigatória).
- [x] `app/_data-access/dashboard/` **não é movida** — wrappers em `app/_data-access/reports/` reaproveitam o `fetch*Raw` interno.
- [x] Queries que usam `CaptureSource` filtram `name != 'Backfill'` por padrão (evita poluir relatórios com origem sintética).

### UI
- [ ] shadcn-first absoluto — zero HTML hardcoded para `<button>`, `<aside>`, `<dialog>`, `<input>`. Se faltar componente, instalar via `pnpm dlx`.
- [ ] `FormLabel` SEMPRE dentro de `FormField`. Filtros via nuqs usam `<Label>` direto (não há `FormField`).
- [ ] `useEffect` apenas para sincronização externa.
- [ ] Drill-down via `Sheet` shadcn, side="right", largura `sm:max-w-2xl`. Estado em nuqs (`drillKpi`, `drillPage`).
- [ ] Skeletons via `<Suspense>` por bloco.
- [ ] Atribuição rotulada — todo card baseado em first/last/per-deal carrega `<ReportsAttributionBadge />`.
- [ ] Comparação de período visível em todo KPI (`+X% vs período anterior` via `formatVariation`).

### Actions (se houver — só seções com mutação, hoje nenhuma; mas a regra fica registrada)
- [ ] `orgActionClient` default. **Nunca** `freeOrgActionClient`.
- [ ] `requirePermission(canPerformAction(ctx, '<entity>', '<op>'))` antes de mutação.
- [ ] `revalidateTag('reports:${ctx.orgId}')` após mutação que afete dado mostrado em reports — ainda que a tag primária da mutação seja outra.

### Código
- [ ] Sem `any`. `interface` preferido a `type`. `async/await` em vez de `.then()`.
- [ ] Sem `else` — early returns.
- [ ] Parâmetros descritivos em callbacks (`channels.map((channel) => ...)`, nunca `channels.map((c) => ...)`).
- [ ] Magic numbers extraídos para const (`const DRILL_PAGE_SIZE = 20`, `const REPORTS_CACHE_REVALIDATE_S = 3600`).
- [ ] Mensagens UI em PT-BR, código em EN.
- [ ] Server Components fazem `Promise.all` para fetch paralelo.

---

## 9. Decisões Cristalizadas

1. **Shell-first.** Nada de gráfico novo entra na Fase 1. Reduz risco de PR gigante e força validação cedo da navegação.
2. **Nav secundária em `<nav>` simples (não tabs, não shadcn Sidebar).** O `/dashboard` continua com tabs — é operacional, poucos contextos. Reports tem 7 seções; sidebar de seções é o padrão correto. A `ReportsSidebar` é um `<nav>` custom — não instala shadcn Sidebar para evitar conflito com o sistema de sidebar próprio do app (`AppSidebar`, `useSidebar`, `SidebarItem` em `@/_components/layout/`).
3. **Reports não é o dashboard renomeado.** Tabela de reaproveitamento em §3 é o contrato: o que reusa, adapta, ou descarta.
4. **Tag de cache única `reports:${orgId}`** no MVP. Granular por seção só se invalidação ficar ruidosa em produção.
5. **Drill-down via `Sheet` shadcn — sem rota dedicada.** URL state via nuqs mantém linkabilidade.
6. **Gating em Essential+** com `<ReportsPlanGate />` in-place (não redirect). Item "Relatórios" sempre visível no sidebar principal.
7. **`requiresElevated` é defesa em profundidade**: sidebar oculta + server-side redirect na page.
8. **Metas contextuais — sem `/reports/goals`.** `<GoalProgressCard />` consumido em overview (ORG), pipeline (PIPELINE), team (MEMBER).
9. **Modelo de atribuição rotulado** em todo card que depende dele. Default `first touch` em overview, `last touch` em products.
10. **`orgActionClient` em qualquer mutação que apareça em reports** — incluindo `/reports/team`. UI oculta para MEMBER; a action revalida RBAC internamente.
11. **Inbox e AI são MVP** — adaptados (não migrados) do dashboard atual. Wrappers de tag-only nas queries.
12. **Pipeline velocity e team performance são diferencial competitivo** — viraram MVP intencionalmente para reports não ficar igual ao dashboard atual.

---

## 10. Open Decisions

1. ~~**`DealStageHistory` existe no schema?**~~ **RESOLVIDO:** confirmado que **não existe**. `getStageTimings` deferido — requer migration. `getPipelineVelocity` usa `Deal.updatedAt` como proxy.

2. **Cache independente para Inbox e AI em reports:** os 7 wrappers inbox e 1 wrapper AI foram criados (`get-*-for-reports.ts`) mas as pages usam componentes do dashboard self-contained que chamam suas próprias queries (tag `conversations:${orgId}`). Para que `revalidateTag('reports:${orgId}')` funcione nessas seções seria necessário reescrever os componentes para aceitar injeção de dados. Decidir na Fase 7/8 se o custo vale.

3. ~~**Sidebar collapsible**~~ **N/A:** sidebar de seções usa `<nav>` simples, sem shadcn Sidebar.

4. **Tour de onboarding:** macro na entrada de `/reports` OU por seção? MVP entregue — retomar quando houver demanda.

5. **Exclusão de `BACKFILL` no relatório de canal:** implementado com filtro por `capturedAutomatically`. Toggle para auditoria pode ser adicionado caso surja demanda.

6. **Exportação CSV:** fora de escopo do MVP. Reabrir quando relatórios estiverem em produção.

7. **`/reports/products` — atribuição por canal:** decidir na Fase 8.

8. **`Activity` em `getTeamPerformance`:** decidir na Fase 7 — ranking por deals é suficiente para MVP.

9. **Drill-down com conteúdo real:** `ReportsDrillDownSheet` existe com shell e estado nuqs funcionando. `DrillDownBody` exibe placeholder "Em breve". Implementar queries de drill (`get-channel-attribution-rows.ts` já existe) e conectar ao body do Sheet conforme cada seção for evoluindo.

---

## 11. Arquivos a Criar / Modificar (Sumário)

### Criar — Fase 1 (Shell)

```
app/(authenticated)/org/[orgSlug]/(main)/reports/
├── layout.tsx
├── page.tsx
├── _config/report-sections.ts
├── _components/
│   ├── reports-sidebar.tsx
│   ├── reports-sidebar-item.tsx
│   ├── reports-global-filters.tsx
│   ├── assignee-filter.tsx                # extraído de dashboard-filters-bar
│   ├── reports-plan-gate.tsx
│   ├── reports-section-header.tsx
│   ├── reports-attribution-badge.tsx
│   └── (reports-drill-down-sheet.tsx vem na Fase 2)
├── _hooks/use-drill-down-state.ts
└── overview/page.tsx                       # placeholder

app/_data-access/reports/shared/
├── reports-cache.ts
├── reports-filters.ts
├── build-reports-where.ts
└── reports-types.ts
```

### Criar — Fases 2-6 ✅ CONCLUÍDO

```
# Novas queries (implementadas)
app/_data-access/reports/overview/get-channel-attribution.ts           ✅
app/_data-access/reports/overview/get-channel-attribution-rows.ts      ✅
app/_data-access/reports/pipeline/get-pipeline-velocity.ts             ✅
app/_data-access/reports/pipeline/get-deals-at-risk.ts                 ✅
app/_data-access/reports/lost-deals/get-lost-deals-analysis.ts         ✅

# Wrappers tag-only (implementados)
app/_data-access/reports/overview/get-kpi-metrics-for-reports.ts       ✅
app/_data-access/reports/overview/get-revenue-over-time-for-reports.ts ✅
app/_data-access/reports/pipeline/get-funnel-data-for-reports.ts       ✅
app/_data-access/reports/inbox/get-inbox-kpi-metrics-for-reports.ts    ✅ (criado, ver Open Decision 2)
app/_data-access/reports/inbox/get-conversation-volume-for-reports.ts  ✅ (criado, ver Open Decision 2)
app/_data-access/reports/inbox/get-channel-distribution-for-reports.ts ✅ (criado, ver Open Decision 2)
app/_data-access/reports/inbox/get-hourly-heatmap-for-reports.ts       ✅ (criado, ver Open Decision 2)
app/_data-access/reports/inbox/get-top-labels-for-reports.ts           ✅ (criado, ver Open Decision 2)
app/_data-access/reports/inbox/get-ai-human-breakdown-for-reports.ts   ✅ (criado, ver Open Decision 2)
app/_data-access/reports/inbox/get-attendant-performance-for-reports.ts ✅ (criado, ver Open Decision 2)
app/_data-access/reports/ai/get-ai-metrics-for-reports.ts              ✅ (criado, ver Open Decision 2)

# Deferido — requer DealStageHistory migration
app/_data-access/reports/pipeline/get-stage-timings.ts                 ⏳ Open Decision 1

# Deferido — Fases 7 e 8
app/_data-access/reports/team/get-team-performance.ts                  ⏳ Fase 7
app/_data-access/reports/team/get-team-member-detail.ts                ⏳ Fase 7
app/_data-access/reports/products/get-product-mix.ts                   ⏳ Fase 8
app/_data-access/reports/products/get-revenue-by-product.ts            ⏳ Fase 8
app/_data-access/reports/products/get-top-products.ts                  ⏳ Fase 8
```

### Modificar ✅ CONCLUÍDO

```
app/(authenticated)/org/[orgSlug]/(main)/_components/sidebar-content.tsx
  → item "Relatórios" adicionado com BarChart3 icon.                    ✅

app/(authenticated)/org/[orgSlug]/(main)/reports/_components/assignee-filter.tsx
  → extraído do dashboard como componente próprio.                      ✅
```

### Não modificar (proposital)

- `prisma/schema.prisma` — `DealStageHistory` não existe; aguarda migration dedicada (Open Decision 1).
- `app/(authenticated)/org/[orgSlug]/(main)/dashboard/page.tsx` — dashboard intacto. ✅
- `app/_data-access/dashboard/index.ts` — exports continuam servindo o dashboard. ✅

---

## 12. Referências (arquivos do projeto)

- `plans/customer-lifecycle/PLAN-customer-lifecycle.md` §1, §3.10, §3.11, §8 — fonte de produto.
- `plans/customer-lifecycle/PLAN-goals.md` — template de qualidade + `GoalProgressCard` reusável.
- `plans/customer-lifecycle/PLAN-lifecycle-automations.md` — fonte das tabelas `CaptureEvent`, `DealCaptureEvent`, `ContactLifecycleHistory`.
- `app/(authenticated)/org/[orgSlug]/(main)/dashboard/page.tsx` — referência de fetch paralelo + Suspense.
- `app/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/dashboard-filters-bar.tsx` — padrão nuqs (`shallow: false`) e shape de filtros.
- `app/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/date-range-picker.tsx` — reusado diretamente.
- `app/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/kpi-card.tsx` + `kpi-grid.tsx` — base do `OverviewKpiGrid`.
- `app/_data-access/dashboard/get-kpi-metrics.ts` — padrão canônico de query com `prev*`, `unstable_cache`, RBAC.
- `app/_data-access/dashboard/build-dashboard-where.ts` — padrão de WHERE composto com filtros.
- `app/_data-access/dashboard/types.ts` + `inbox-dashboard-types.ts` — DTOs reusáveis.
- `app/_utils/date-range.ts` — `parseDateRange`, `getPreviousPeriod`, `formatVariation`, `getDateRangePresets`.
- `app/_lib/rbac/plan-limits.ts` — `getEffectivePlan` para gating de plano.
- `app/_lib/rbac/` — `isElevated`, `canPerformAction`, `requirePermission`.
- `app/_lib/safe-action.ts` — `orgActionClient` (default obrigatório se houver mutações futuras).
- `app/_components/goal-progress-card/` — `GoalProgressCard` reusável (já em produção).
- `CLAUDE.md` — padrões de cache, RBAC, action clients, shadcn-first.
