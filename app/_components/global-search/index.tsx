'use client'

import { useRef, useEffect, useState } from 'react'
import { Command as CmdkPrimitive } from 'cmdk'
import { Search, Loader2, ArrowRight, X, SearchX } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/_components/ui/popover'
import { useGlobalSearch } from '@/_components/hooks/use-global-search'
import { SearchResultItemComponent } from './search-result-item'
import type { SearchResultGroup } from '@/_data-access/search/types'

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
      className="flex items-center gap-3 rounded-md px-2 py-2 text-muted-foreground"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-medium">
        Ver todos os {count} {label}
      </span>
    </CommandItem>
  )
}

export function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug ?? ''

  const { query, setQuery, results, isLoading, isMinChars, reset } =
    useGlobalSearch()

  const [isMac, setIsMac] = useState(true)

  const isOpen = query.length > 0

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPod|iPad/.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = (href: string) => {
    router.push(href)
    reset()
    inputRef.current?.blur()
  }

  const hasResults = results.totalCount > 0
  const showEmptyState =
    !isLoading && !isMinChars && query.length >= 3 && !hasResults
  const highlightQuery = results.query || query

  const hasMoreContacts =
    results.contacts.totalCount > results.contacts.items.length
  const hasMoreDeals = results.deals.totalCount > results.deals.items.length
  const hasMoreConversations =
    results.conversations.totalCount > results.conversations.items.length

  const encodedQuery = encodeURIComponent(query)
  const contactsViewAllHref = `/org/${orgSlug}/crm/contacts?search=${encodedQuery}`
  const dealsViewAllHref = `/org/${orgSlug}/crm/deals/list?search=${encodedQuery}`
  const conversationsViewAllHref = `/org/${orgSlug}/inbox?search=${encodedQuery}`

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
    <div className="relative hidden md:block">
      {/*
        Command envolve tudo — PopoverContent renderiza em portal no body, mas
        ainda é descendente React de Command, então o contexto cmdk funciona corretamente.
      */}
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <Popover open={isOpen} onOpenChange={(open) => !open && reset()}>
          <PopoverAnchor asChild>
            <div className="flex h-9 w-96 items-center gap-2 rounded-xl bg-background px-3 ring-1 ring-white/10 transition-shadow focus-within:ring-white/30">
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <CmdkPrimitive.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar contatos, empresas..."
                className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query.length === 0 ? (
                <kbd className="pointer-events-none flex h-5 select-none items-center gap-0.5 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                  {isMac ? <><span>⌘</span>K</> : <>Ctrl K</>}
                </kbd>
              ) : (
                <button
                  tabIndex={-1}
                  onClick={() => {
                    reset()
                    inputRef.current?.focus()
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </PopoverAnchor>

          <PopoverContent
            className="w-96 rounded-2xl p-0"
            sideOffset={6}
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={() => {
              reset()
              inputRef.current?.blur()
            }}
          >
            <CommandList className="max-h-[420px]">
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-xs">Buscando...</span>
                </div>
              )}

              {isMinChars && !isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Search className="h-5 w-5 opacity-40" />
                  <span className="text-xs">
                    Digite pelo menos 3 caracteres
                  </span>
                </div>
              )}

              {showEmptyState && (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                  <SearchX className="h-5 w-5 opacity-40" />
                  <span className="text-xs">Nenhum resultado encontrado</span>
                </div>
              )}

              {!isLoading && hasResults && (
                <div className="p-1.5">
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
                    false,
                    '',
                    '',
                  )}
                  {renderGroup(
                    results.deals,
                    'Negócios',
                    hasMoreDeals,
                    dealsViewAllHref,
                    'negócios',
                  )}
                  {renderGroup(
                    results.conversations,
                    'Conversas',
                    hasMoreConversations,
                    conversationsViewAllHref,
                    'conversas',
                  )}
                </div>
              )}
            </CommandList>

            {hasResults && !isLoading && (
              <div className="flex items-center justify-between border-t px-3 py-2">
                <span className="text-[11px] text-muted-foreground/60">
                  {results.totalCount} resultado
                  {results.totalCount !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-muted px-1 font-mono ring-1 ring-border">
                      ↑↓
                    </kbd>
                    navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-muted px-1 font-mono ring-1 ring-border">
                      ↵
                    </kbd>
                    abrir
                  </span>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </Command>
    </div>
  )
}
