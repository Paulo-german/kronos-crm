'use client'

import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
} from '@/_components/ui/command'
import { useGlobalSearch } from '@/_components/hooks/use-global-search'
import { SearchResultItemComponent } from './search-result-item'

interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: GlobalSearchDialogProps) {
  const router = useRouter()
  const { query, setQuery, results, isLoading, isMinChars, reset } =
    useGlobalSearch()

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
    }
    onOpenChange(newOpen)
  }

  const handleSelect = (href: string) => {
    router.push(href)
    handleOpenChange(false)
  }

  const hasResults = results.totalCount > 0
  const showEmptyState =
    !isLoading && !isMinChars && query.length >= 3 && !hasResults

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Buscar contatos, empresas, negócios..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isMinChars && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Digite pelo menos 3 caracteres
          </div>
        )}

        {showEmptyState && (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        )}

        {!isLoading && hasResults && (
          <>
            {results.contacts.length > 0 && (
              <CommandGroup heading="Contatos">
                {results.contacts.map((item) => (
                  <SearchResultItemComponent
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )}

            {results.companies.length > 0 && (
              <CommandGroup heading="Empresas">
                {results.companies.map((item) => (
                  <SearchResultItemComponent
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )}

            {results.deals.length > 0 && (
              <CommandGroup heading="Negócios">
                {results.deals.map((item) => (
                  <SearchResultItemComponent
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
