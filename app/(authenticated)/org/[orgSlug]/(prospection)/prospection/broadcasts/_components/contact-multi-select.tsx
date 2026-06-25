'use client'

import { useRef, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { Check, Loader2, X, Search } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
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
import {
  searchBroadcastContacts,
  type BroadcastContactOption,
} from '@/_actions/broadcast/search-broadcast-contacts'
import { cn } from '@/_lib/utils'

interface ContactMultiSelectProps {
  selected: BroadcastContactOption[]
  onChange: (contacts: BroadcastContactOption[]) => void
}

const SEARCH_DEBOUNCE_MS = 300

export const ContactMultiSelect = ({
  selected,
  onChange,
}: ContactMultiSelectProps) => {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<BroadcastContactOption[]>([])
  const [query, setQuery] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const pageRef = useRef(1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { execute, isPending } = useAction(searchBroadcastContacts, {
    onSuccess: ({ data: result }) => {
      if (!result) return
      setResults((prev) =>
        result.page === 1 ? result.data : [...prev, ...result.data],
      )
      setHasMore(result.hasMore)
      pageRef.current = result.page
    },
  })

  const handleQueryChange = (value: string) => {
    setQuery(value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => execute({ query: value, page: 1 }),
      SEARCH_DEBOUNCE_MS,
    )
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    // Carga inicial ao abrir pela primeira vez
    if (next && results.length === 0) execute({ query: '', page: 1 })
  }

  const selectedIds = new Set(selected.map((contact) => contact.id))

  const toggle = (contact: BroadcastContactOption) => {
    if (selectedIds.has(contact.id)) {
      onChange(selected.filter((item) => item.id !== contact.id))
      return
    }
    onChange([...selected, contact])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal"
          >
            <Search className="size-4" />
            {selected.length > 0
              ? `${selected.length} contato${selected.length > 1 ? 's' : ''} selecionado${selected.length > 1 ? 's' : ''}`
              : 'Buscar e selecionar contatos'}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nome ou telefone..."
              value={query}
              onValueChange={handleQueryChange}
            />
            <CommandList>
              {isPending && results.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <CommandEmpty>
                  Nenhum contato com telefone encontrado.
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => toggle(contact)}
                    >
                      <Check
                        className={cn(
                          'size-4',
                          selectedIds.has(contact.id)
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                      />
                      <span className="flex-1 truncate">{contact.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {contact.phone}
                      </span>
                    </CommandItem>
                  ))}
                  {hasMore && (
                    <CommandItem
                      value="__load_more__"
                      onSelect={() =>
                        execute({ query, page: pageRef.current + 1 })
                      }
                      className="justify-center text-xs text-muted-foreground"
                    >
                      {isPending ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        'Carregar mais'
                      )}
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((contact) => (
            <Badge key={contact.id} variant="secondary" className="gap-1">
              {contact.name}
              <button
                type="button"
                onClick={() => toggle(contact)}
                className="ml-0.5 rounded-full hover:text-destructive"
                aria-label={`Remover ${contact.name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
