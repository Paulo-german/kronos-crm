'use client'

import { User, Building2, Kanban } from 'lucide-react'
import { CommandItem } from '@/_components/ui/command'
import { SearchResultItem, SearchResultType } from '@/_data-access/search/types'

const iconMap: Record<SearchResultType, React.ElementType> = {
  contact: User,
  company: Building2,
  deal: Kanban,
}

interface SearchResultItemComponentProps {
  item: SearchResultItem
  onSelect: (href: string) => void
}

export function SearchResultItemComponent({
  item,
  onSelect,
}: SearchResultItemComponentProps) {
  const Icon = iconMap[item.type]

  return (
    <CommandItem value={item.id} onSelect={() => onSelect(item.href)}>
      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span>{item.title}</span>
        {item.subtitle && (
          <span className="text-xs text-muted-foreground">{item.subtitle}</span>
        )}
      </div>
    </CommandItem>
  )
}
