'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar,
  CheckCircle2,
  Layers,
  Newspaper,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { ChangelogEntryCard } from './changelog-entry-card'
import type { ChangelogEntryPublicDto } from '@/_data-access/changelog/types'
import type { ChangelogEntryType } from '@prisma/client'

interface ChangelogContentProps {
  entries: ChangelogEntryPublicDto[]
}

type FilterType = 'ALL' | ChangelogEntryType

interface FilterOption {
  value: FilterType
  label: string
  icon: React.ReactNode
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'Tudo', icon: <Layers className="h-3.5 w-3.5" /> },
  {
    value: 'NEW',
    label: 'Novidades',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    value: 'IMPROVEMENT',
    label: 'Melhorias',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  {
    value: 'FIX',
    label: 'Correções',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
]

/** Agrupa as entradas por mês/ano, retornando pares [label, entradas[]] */
const groupByMonth = (
  entries: ChangelogEntryPublicDto[],
): Array<{ label: string; entries: ChangelogEntryPublicDto[] }> => {
  const grouped = new Map<string, ChangelogEntryPublicDto[]>()

  for (const entry of entries) {
    const key = format(new Date(entry.publishedAt), 'MMMM yyyy', {
      locale: ptBR,
    })
    const existing = grouped.get(key)
    if (existing) {
      existing.push(entry)
    } else {
      grouped.set(key, [entry])
    }
  }

  return Array.from(grouped.entries()).map(([label, groupEntries]) => ({
    label,
    entries: groupEntries,
  }))
}

export const ChangelogContent = ({ entries }: ChangelogContentProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL')

  const filteredEntries =
    activeFilter === 'ALL'
      ? entries
      : entries.filter((entry) => entry.type === activeFilter)

  const groups = groupByMonth(filteredEntries)

  const getCount = (type: FilterType) => {
    if (type === 'ALL') return entries.length
    return entries.filter((entry) => entry.type === type).length
  }

  return (
    <div>
      {/* Filtros com ícone e contagem */}
      <div className="mb-10 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const count = getCount(option.value)
          const isActive = activeFilter === option.value
          return (
            <Button
              key={option.value}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(option.value)}
              className="gap-1.5 rounded-full"
            >
              {option.icon}
              {option.label}
              <span
                className={
                  isActive
                    ? 'ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none'
                    : 'ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground'
                }
              >
                {count}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-muted/50 p-4">
            <Newspaper className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma atualização encontrada para este filtro.
          </p>
          <Button
            variant="link"
            onClick={() => setActiveFilter('ALL')}
            className="mt-3"
          >
            Ver todas as atualizações
          </Button>
        </div>
      )}

      {/* Timeline por mês */}
      {groups.map((group) => (
        <div key={group.label} className="mb-10">
          {/* Header do mês */}
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground/60" />
            <h2 className="text-sm font-semibold capitalize text-muted-foreground">
              {group.label}
            </h2>
          </div>

          {/* Timeline com linha vertical */}
          <div className="relative ml-3 border-l-2 border-border/60 pl-6 sm:ml-4 sm:pl-8">
            {group.entries.map((entry) => (
              <ChangelogEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
