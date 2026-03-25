'use client'

import { useRouter, useParams } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/_components/ui/command'
import { useGlobalSearch } from '@/_components/hooks/use-global-search'
import { SearchResultItemComponent } from './search-result-item'
import { SearchResultGroup } from '@/_data-access/search/types'

interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ViewAllItemProps {
  label: string
  count: number
  href: string
  onSelect: (href: string) => void
}

function ViewAllItem({ label, count, href, onSelect }: ViewAllItemProps) {
  return (
    <CommandItem
      value={`ver-todos-${href}`}
      onSelect={() => onSelect(href)}
      className="text-muted-foreground"
    >
      <ArrowRight className="mr-2 h-3.5 w-3.5 shrink-0" />
      <span className="text-xs">
        Ver todos os {count} {label}
      </span>
    </CommandItem>
  )
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: GlobalSearchDialogProps) {
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug ?? ''

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

  // Usa a query retornada pelo backend (já processada/normalizada) para highlight.
  // Fallback para a query local durante o loading.
  const highlightQuery = results.query || query

  const hasMoreContacts =
    results.contacts.totalCount > results.contacts.items.length
  const hasMoreCompanies =
    results.companies.totalCount > results.companies.items.length
  const hasMoreDeals = results.deals.totalCount > results.deals.items.length

  // Contatos e empresas suportam ?search= na listagem de contatos
  const encodedQuery = encodeURIComponent(query)
  const contactsViewAllHref = `/org/${orgSlug}/contacts?search=${encodedQuery}`
  // Empresas ainda vivem na aba de contatos; navegar para listagem base de contatos
  const companiesViewAllHref = `/org/${orgSlug}/contacts?search=${encodedQuery}`
  // A listagem de deals ainda não suporta ?search=; navegar para a lista sem filtro
  const dealsViewAllHref = `/org/${orgSlug}/crm/deals/list`

  const renderGroup = (
    group: SearchResultGroup,
    heading: string,
    hasMore: boolean,
    viewAllHref: string,
    viewAllLabel: string,
  ) => {
    if (group.items.length === 0) return null

    return (
      <CommandGroup heading={heading}>
        {group.items.map((item) => (
          <SearchResultItemComponent
            key={item.id}
            item={item}
            query={highlightQuery}
            onSelect={handleSelect}
          />
        ))}
        {hasMore && (
          <ViewAllItem
            label={viewAllLabel}
            count={group.totalCount}
            href={viewAllHref}
            onSelect={handleSelect}
          />
        )}
      </CommandGroup>
    )
  }

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
            {renderGroup(
              results.contacts,
              'Contatos',
              hasMoreContacts,
              contactsViewAllHref,
              'contatos',
            )}
            {renderGroup(
              results.companies,
              'Empresas',
              hasMoreCompanies,
              companiesViewAllHref,
              'empresas',
            )}
            {renderGroup(
              results.deals,
              'Negócios',
              hasMoreDeals,
              dealsViewAllHref,
              'negócios',
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
