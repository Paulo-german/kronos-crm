'use client'

import { User, Building2, Kanban } from 'lucide-react'
import { CommandItem } from '@/_components/ui/command'
import { SearchResultItem, SearchResultType } from '@/_data-access/search/types'
import { HighlightText } from './highlight-text'

const iconMap: Record<SearchResultType, React.ElementType> = {
  contact: User,
  company: Building2,
  deal: Kanban,
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
  const Icon = iconMap[item.type]

  return (
    <CommandItem value={item.id} onSelect={() => onSelect(item.href)}>
      <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate">
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
