'use client'

import * as React from 'react'
import {
  parseAsString,
  parseAsArrayOf,
  parseAsInteger,
  useQueryStates,
} from 'nuqs'
import {
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Clock,
  Package,
  Users,
  GitBranch,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Zap,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import { Badge } from '@/_components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { cn } from '@/_lib/utils'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ProductDto } from '@/_data-access/product/get-products'

// --- Parsers nuqs com shallow: false para forçar re-render server-side ---
const dashboardFiltersParsers = {
  pipelineId: parseAsString.withOptions({ shallow: false }),
  assignee: parseAsString.withOptions({ shallow: false }),
  status: parseAsArrayOf(parseAsString).withDefault([]).withOptions({ shallow: false }),
  priority: parseAsArrayOf(parseAsString).withDefault([]).withOptions({ shallow: false }),
  inactiveDays: parseAsInteger.withOptions({ shallow: false }),
  productId: parseAsString.withOptions({ shallow: false }),
}

// --- Config de Status ---
const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto', color: 'hsl(var(--primary))' },
  { value: 'IN_PROGRESS', label: 'Em andamento', color: 'hsl(var(--kronos-blue))' },
  { value: 'WON', label: 'Ganho', color: 'var(--kronos-green)' },
  { value: 'LOST', label: 'Perdido', color: 'hsl(var(--kronos-red))' },
  { value: 'PAUSED', label: 'Pausado', color: 'hsl(var(--muted-foreground))' },
] as const

// --- Config de Prioridade ---
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', icon: ArrowDown, className: 'text-slate-400' },
  { value: 'medium', label: 'Média', icon: ArrowRight, className: 'text-amber-400' },
  { value: 'high', label: 'Alta', icon: ArrowUp, className: 'text-orange-500' },
  { value: 'urgent', label: 'Urgente', icon: Zap, className: 'text-red-500' },
] as const

// --- Opções de Inatividade ---
const INACTIVITY_OPTIONS = [
  { value: '3', label: '3 dias' },
  { value: '7', label: '7 dias' },
  { value: '14', label: '14 dias' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
]

// --- Tipos ---
interface DashboardFiltersBarProps {
  pipelines: OrgPipelineDto[]
  members: AcceptedMemberDto[] | null
  products: ProductDto[]
  isElevated: boolean
}

// --- Helpers ---
function getMemberInitials(member: AcceptedMemberDto): string {
  const name = member.user?.fullName ?? member.email
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// --- Componente Principal ---
export function DashboardFiltersBar({
  pipelines,
  members,
  products,
  isElevated,
}: DashboardFiltersBarProps) {
  const [filters, setFilters] = useQueryStates(dashboardFiltersParsers)

  const hasActiveFilters =
    !!filters.pipelineId ||
    !!filters.assignee ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    !!filters.inactiveDays ||
    !!filters.productId

  function clearAllFilters() {
    void setFilters({
      pipelineId: null,
      assignee: null,
      status: [],
      priority: [],
      inactiveDays: null,
      productId: null,
    })
  }

  // Badges de filtros ativos para exibição compacta
  const activeFilterBadges: Array<{ key: string; label: string }> = []

  if (filters.pipelineId) {
    const pipeline = pipelines.find((p) => p.id === filters.pipelineId)
    if (pipeline) {
      activeFilterBadges.push({ key: 'pipelineId', label: pipeline.name })
    }
  }

  if (filters.assignee && isElevated) {
    const member = members?.find((m) => m.userId === filters.assignee)
    if (member) {
      activeFilterBadges.push({
        key: 'assignee',
        label: member.user?.fullName ?? member.email,
      })
    }
  }

  for (const statusValue of filters.status) {
    const opt = STATUS_OPTIONS.find((s) => s.value === statusValue)
    if (opt) {
      activeFilterBadges.push({ key: `status-${statusValue}`, label: opt.label })
    }
  }

  for (const priorityValue of filters.priority) {
    const opt = PRIORITY_OPTIONS.find((p) => p.value === priorityValue)
    if (opt) {
      activeFilterBadges.push({ key: `priority-${priorityValue}`, label: opt.label })
    }
  }

  if (filters.inactiveDays) {
    const opt = INACTIVITY_OPTIONS.find(
      (o) => o.value === String(filters.inactiveDays),
    )
    activeFilterBadges.push({
      key: 'inactiveDays',
      label: `Inativos há ${opt?.label ?? `${filters.inactiveDays} dias`}`,
    })
  }

  if (filters.productId) {
    const product = products.find((p) => p.id === filters.productId)
    if (product) {
      activeFilterBadges.push({ key: 'productId', label: product.name })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Linha de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filtro: Pipeline — só renderiza se houver mais de 1 */}
        {pipelines.length > 1 && (
          <PipelineFilter
            pipelines={pipelines}
            value={filters.pipelineId ?? null}
            onChange={(value) => void setFilters({ pipelineId: value })}
          />
        )}

        {/* Filtro: Membro — só para elevated */}
        {isElevated && members && members.length > 0 && (
          <AssigneeFilter
            members={members}
            value={filters.assignee ?? null}
            onChange={(value) => void setFilters({ assignee: value })}
          />
        )}

        {/* Filtro: Status multi-select */}
        <StatusFilter
          value={filters.status}
          onChange={(value) => void setFilters({ status: value })}
        />

        {/* Filtro: Prioridade multi-select */}
        <PriorityFilter
          value={filters.priority}
          onChange={(value) => void setFilters({ priority: value })}
        />

        {/* Filtro: Inatividade */}
        <InactivityFilter
          value={filters.inactiveDays ?? null}
          onChange={(value) => void setFilters({ inactiveDays: value })}
        />

        {/* Filtro: Produto */}
        {products.length > 0 && (
          <ProductFilter
            products={products}
            value={filters.productId ?? null}
            onChange={(value) => void setFilters({ productId: value })}
          />
        )}

        {/* Limpar todos */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Badges de filtros ativos */}
      {activeFilterBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilterBadges.map((badge) => (
            <ActiveFilterBadge
              key={badge.key}
              label={badge.label}
              onRemove={() => removeBadgeFilter(badge.key, filters, setFilters)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Função para remover badge individual ---
function removeBadgeFilter(
  key: string,
  filters: {
    pipelineId: string | null
    assignee: string | null
    status: string[]
    priority: string[]
    inactiveDays: number | null
    productId: string | null
  },
  setFilters: (values: Partial<{
    pipelineId: string | null
    assignee: string | null
    status: string[]
    priority: string[]
    inactiveDays: number | null
    productId: string | null
  }>) => void,
) {
  if (key === 'pipelineId') {
    void setFilters({ pipelineId: null })
    return
  }
  if (key === 'assignee') {
    void setFilters({ assignee: null })
    return
  }
  if (key.startsWith('status-')) {
    const statusValue = key.replace('status-', '')
    void setFilters({ status: filters.status.filter((s) => s !== statusValue) })
    return
  }
  if (key.startsWith('priority-')) {
    const priorityValue = key.replace('priority-', '')
    void setFilters({ priority: filters.priority.filter((p) => p !== priorityValue) })
    return
  }
  if (key === 'inactiveDays') {
    void setFilters({ inactiveDays: null })
    return
  }
  if (key === 'productId') {
    void setFilters({ productId: null })
  }
}

// --- Sub-componentes de filtro ---

interface PipelineFilterProps {
  pipelines: OrgPipelineDto[]
  value: string | null
  onChange: (value: string | null) => void
}

function PipelineFilter({ pipelines, value, onChange }: PipelineFilterProps) {
  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(v) => onChange(v === 'all' ? null : v)}
    >
      <SelectTrigger className="h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium">
        <GitBranch className="size-3.5 text-muted-foreground" />
        <SelectValue placeholder="Funil" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os funis</SelectItem>
        <SelectSeparator />
        {pipelines.map((pipeline) => (
          <SelectItem key={pipeline.id} value={pipeline.id}>
            {pipeline.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface AssigneeFilterProps {
  members: AcceptedMemberDto[]
  value: string | null
  onChange: (value: string | null) => void
}

function AssigneeFilter({ members, value, onChange }: AssigneeFilterProps) {
  const selectedMember = members.find((m) => m.userId === value)

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(v) => onChange(v === 'all' ? null : v)}
    >
      <SelectTrigger className="h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium">
        <Users className="size-3.5 text-muted-foreground" />
        {selectedMember ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-4">
              <AvatarImage
                src={selectedMember.user?.avatarUrl ?? undefined}
                alt={selectedMember.user?.fullName ?? selectedMember.email}
              />
              <AvatarFallback className="text-[8px]">
                {getMemberInitials(selectedMember)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">
              {selectedMember.user?.fullName ?? selectedMember.email}
            </span>
          </div>
        ) : (
          <SelectValue placeholder="Membro" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os membros</SelectItem>
        <SelectSeparator />
        {members.map((member) => (
          <SelectItem
            key={member.id}
            value={member.userId ?? member.id}
          >
            <div className="flex items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage
                  src={member.user?.avatarUrl ?? undefined}
                  alt={member.user?.fullName ?? member.email}
                />
                <AvatarFallback className="text-[9px]">
                  {getMemberInitials(member)}
                </AvatarFallback>
              </Avatar>
              <span>{member.user?.fullName ?? member.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface StatusFilterProps {
  value: string[]
  onChange: (value: string[]) => void
}

function StatusFilter({ value, onChange }: StatusFilterProps) {
  const [open, setOpen] = React.useState(false)

  function toggleStatus(statusValue: string) {
    if (value.includes(statusValue)) {
      onChange(value.filter((s) => s !== statusValue))
    } else {
      onChange([...value, statusValue])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 border px-2.5 text-xs font-medium',
            value.length > 0 && 'border-primary/40 bg-primary/5 text-primary',
          )}
        >
          <AlertCircle className="size-3.5" />
          Status
          {value.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 rounded-sm px-1 py-0 text-[10px] font-medium"
            >
              {value.length}
            </Badge>
          )}
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar status..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {STATUS_OPTIONS.map((option) => {
                const isSelected = value.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => toggleStatus(option.value)}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <div
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                      <span>{option.label}</span>
                    </div>
                    <Check
                      className={cn(
                        'ml-auto size-4',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface PriorityFilterProps {
  value: string[]
  onChange: (value: string[]) => void
}

function PriorityFilter({ value, onChange }: PriorityFilterProps) {
  const [open, setOpen] = React.useState(false)

  function togglePriority(priorityValue: string) {
    if (value.includes(priorityValue)) {
      onChange(value.filter((p) => p !== priorityValue))
    } else {
      onChange([...value, priorityValue])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 border px-2.5 text-xs font-medium',
            value.length > 0 && 'border-primary/40 bg-primary/5 text-primary',
          )}
        >
          <ArrowUp className="size-3.5" />
          Prioridade
          {value.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 rounded-sm px-1 py-0 text-[10px] font-medium"
            >
              {value.length}
            </Badge>
          )}
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar prioridade..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {PRIORITY_OPTIONS.map((option) => {
                const isSelected = value.includes(option.value)
                const Icon = option.icon
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => togglePriority(option.value)}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <Icon className={cn('size-4', option.className)} />
                      <span>{option.label}</span>
                    </div>
                    <Check
                      className={cn(
                        'ml-auto size-4',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface InactivityFilterProps {
  value: number | null
  onChange: (value: number | null) => void
}

function InactivityFilter({ value, onChange }: InactivityFilterProps) {
  return (
    <Select
      value={value ? String(value) : 'all'}
      onValueChange={(v) => onChange(v === 'all' ? null : Number(v))}
    >
      <SelectTrigger className={cn(
        'h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium',
        value && 'border-primary/40 bg-primary/5 text-primary',
      )}>
        <Clock className="size-3.5 text-muted-foreground" />
        {value ? (
          <span>
            {INACTIVITY_OPTIONS.find((o) => o.value === String(value))?.label ?? `${value} dias`} sem atividade
          </span>
        ) : (
          <SelectValue placeholder="Inatividade" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Qualquer atividade</SelectItem>
        <SelectSeparator />
        {INACTIVITY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            Sem atividade há {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface ProductFilterProps {
  products: ProductDto[]
  value: string | null
  onChange: (value: string | null) => void
}

function ProductFilter({ products, value, onChange }: ProductFilterProps) {
  const selectedProduct = products.find((p) => p.id === value)

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(v) => onChange(v === 'all' ? null : v)}
    >
      <SelectTrigger className={cn(
        'h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium',
        value && 'border-primary/40 bg-primary/5 text-primary',
      )}>
        <Package className="size-3.5 text-muted-foreground" />
        {selectedProduct ? (
          <span className="max-w-[120px] truncate">{selectedProduct.name}</span>
        ) : (
          <SelectValue placeholder="Produto" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os produtos</SelectItem>
        <SelectSeparator />
        {products.map((product) => (
          <SelectItem key={product.id} value={product.id}>
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate">{product.name}</span>
              {!product.isActive && (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  inativo
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface ActiveFilterBadgeProps {
  label: string
  onRemove: () => void
}

function ActiveFilterBadge({ label, onRemove }: ActiveFilterBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
    >
      {label}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="ml-0.5 size-4 rounded-sm p-0 opacity-60 hover:bg-transparent hover:opacity-100"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="size-3" />
      </Button>
    </Badge>
  )
}
