'use client'

import { User, Building2, Kanban } from 'lucide-react'
import { CommandItem } from '@/_components/ui/command'
import { SearchResultItem, SearchResultType } from '@/_data-access/search/types'
import { HighlightText } from './highlight-text'

const typeConfig: Record<
  SearchResultType,
  { icon: React.ElementType; iconClass: string; containerClass: string }
> = {
  contact: {
    icon: User,
    iconClass: 'text-blue-600',
    containerClass: 'bg-blue-500/10',
  },
  company: {
    icon: Building2,
    iconClass: 'text-orange-600',
    containerClass: 'bg-orange-500/10',
  },
  deal: {
    icon: Kanban,
    iconClass: 'text-emerald-600',
    containerClass: 'bg-emerald-500/10',
  },
}

interface SearchResultItemComponentProps {
  item: SearchResultItem
  query: string
  onSelect: (href: string) => void
}

export function SearchResultItemComponent({
  item,
  query,
  onSelect,
}: SearchResultItemComponentProps) {
  const { icon: Icon, iconClass, containerClass } = typeConfig[item.type]

  return (
    <CommandItem
      value={item.id}
      onSelect={() => onSelect(item.href)}
      className="flex items-center gap-3 rounded-md px-2 py-2"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${containerClass}`}
      >
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          <HighlightText text={item.title} query={query} />
        </span>
        {item.subtitle && (
          <span className="truncate text-xs text-muted-foreground">
            <HighlightText text={item.subtitle} query={query} />
          </span>
        )}
      </div>
    </CommandItem>
  )
}
