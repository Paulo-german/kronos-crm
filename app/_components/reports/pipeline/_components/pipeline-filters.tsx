'use client'

import * as React from 'react'
import { parseAsString, parseAsArrayOf, useQueryStates } from 'nuqs'
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
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  GitBranch,
  Clock,
  AlertCircle,
  Flag,
  Package,
  ChevronDown,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/_lib/utils'
import type { ProductDto } from '@/_data-access/product/get-products'

interface PipelineOption {
  id: string
  name: string
}

interface PipelineFiltersProps {
  pipelines: PipelineOption[]
  products: ProductDto[]
}

const pipelineFiltersParsers = {
  pipelineId: parseAsString.withOptions({ shallow: false }),
  inactiveDays: parseAsString.withOptions({ shallow: false }),
  status: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ shallow: false }),
  priority: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ shallow: false }),
  productId: parseAsString.withOptions({ shallow: false }),
}

const INACTIVE_DAYS_OPTIONS = [
  { value: '7', label: 'Parado há 7 dias' },
  { value: '14', label: 'Parado há 14 dias' },
  { value: '30', label: 'Parado há 30 dias' },
  { value: '60', label: 'Parado há 60 dias' },
] as const

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto', color: 'hsl(var(--primary))' },
  {
    value: 'IN_PROGRESS',
    label: 'Em andamento',
    color: 'hsl(var(--kronos-blue))',
  },
  { value: 'WON', label: 'Ganho', color: 'var(--kronos-green)' },
  { value: 'LOST', label: 'Perdido', color: 'hsl(var(--kronos-red))' },
  { value: 'PAUSED', label: 'Pausado', color: 'hsl(var(--muted-foreground))' },
] as const

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
] as const

export function PipelineFilters({ pipelines, products }: PipelineFiltersProps) {
  const [filters, setFilters] = useQueryStates(pipelineFiltersParsers)

  const hasActiveLocalFilters =
    !!filters.pipelineId ||
    !!filters.inactiveDays ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    !!filters.productId

  function clearLocalFilters() {
    void setFilters({
      pipelineId: null,
      inactiveDays: null,
      status: [],
      priority: [],
      productId: null,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filtro: Pipeline — só renderiza se houver mais de 1 */}
      {pipelines.length > 1 && (
        <Select
          value={filters.pipelineId ?? 'all'}
          onValueChange={(value) =>
            void setFilters({ pipelineId: value === 'all' ? null : value })
          }
        >
          <SelectTrigger
            className={cn(
              'h-8 w-auto min-w-[140px] gap-1.5 border px-2.5 text-xs font-medium',
              filters.pipelineId &&
                'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            <GitBranch className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pipelines</SelectItem>
            <SelectSeparator />
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Filtro: Produto */}
      {products.length > 0 && (
        <ProductFilter
          products={products}
          value={filters.productId ?? null}
          onChange={(value) => void setFilters({ productId: value })}
        />
      )}

      {/* Filtro: Inatividade (para "Deals em Risco") */}
      <Select
        value={filters.inactiveDays ?? 'all'}
        onValueChange={(value) =>
          void setFilters({ inactiveDays: value === 'all' ? null : value })
        }
      >
        <SelectTrigger
          className={cn(
            'h-8 w-auto min-w-[150px] gap-1.5 border px-2.5 text-xs font-medium',
            filters.inactiveDays &&
              'border-primary/40 bg-primary/5 text-primary',
          )}
        >
          <Clock className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Inatividade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer inatividade</SelectItem>
          <SelectSeparator />
          {INACTIVE_DAYS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Limpar filtros locais */}
      {hasActiveLocalFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearLocalFilters}
          className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          Limpar
        </Button>
      )}
    </div>
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
      onChange(value.filter((existing) => existing !== statusValue))
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
            'h-8 w-auto gap-1.5 border px-2.5 text-xs font-medium',
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
      onChange(value.filter((existing) => existing !== priorityValue))
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
            'h-8 w-auto gap-1.5 border px-2.5 text-xs font-medium',
            value.length > 0 && 'border-primary/40 bg-primary/5 text-primary',
          )}
        >
          <Flag className="size-3.5" />
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
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => togglePriority(option.value)}
                  >
                    <span className="flex-1">{option.label}</span>
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

interface ProductFilterProps {
  products: ProductDto[]
  value: string | null
  onChange: (value: string | null) => void
}

function ProductFilter({ products, value, onChange }: ProductFilterProps) {
  const selectedProduct = products.find((product) => product.id === value)

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(selected) =>
        onChange(selected === 'all' ? null : selected)
      }
    >
      <SelectTrigger
        className={cn(
          'h-8 w-auto min-w-[130px] gap-1.5 border px-2.5 text-xs font-medium',
          value && 'border-primary/40 bg-primary/5 text-primary',
        )}
      >
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
