'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { SearchIcon, UserIcon, UploadIcon, ArrowUpDown } from 'lucide-react'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { ContactsFiltersSheet } from './contacts-filters-sheet'
import { ContactFilterBadges } from './contact-filter-badges'
import CreateContactButton from './create-contact-button'
import type { ContactFilters } from '../_lib/contact-filters'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { MemberRole } from '@prisma/client'

const SEARCH_DEBOUNCE_MS = 300

interface ContactsToolbarProps {
  members: AcceptedMemberDto[]
  companyOptions: CompanyDto[]
  currentUserId: string
  userRole: MemberRole
  withinQuota: boolean
  orgSlug: string
  filters: ContactFilters
  onApplyFilters: (filters: Partial<ContactFilters>) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export function ContactsToolbar({
  members,
  companyOptions,
  currentUserId,
  userRole,
  withinQuota,
  orgSlug,
  filters,
  onApplyFilters,
  onClearFilters,
  activeFilterCount,
}: ContactsToolbarProps) {
  const isMember = userRole === 'MEMBER'
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Valor exibido no input (controlado localmente com debounce para URL)
  const [searchInputValue, setSearchInputValue] = useState(
    () => searchParams.get('search') ?? '',
  )

  // Sincroniza o valor do input quando o URL param mudar externamente (ex: limpar filtros)
  const searchFromUrl = searchParams.get('search') ?? ''
  useEffect(() => {
    setSearchInputValue(searchFromUrl)
  }, [searchFromUrl])

  // Debounce: atualiza URL param `search` 300ms após parar de digitar
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchInputValue.trim()) {
        params.set('search', searchInputValue.trim())
      } else {
        params.delete('search')
      }
      // Sempre resetar para página 1 ao mudar a busca
      params.set('page', '1')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
    // Intencionalmente omitimos searchParams do dep array para evitar loop:
    // o timeout só deve disparar quando searchInputValue muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInputValue, router, pathname])

  // Responsável: lido direto da URL, atualiza URL ao mudar
  const assignedToFromUrl = searchParams.get('assignedTo') ?? 'all'

  const handleAssigneeChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all') {
        params.delete('assignedTo')
      } else {
        params.set('assignedTo', value)
      }
      // Sempre resetar para página 1 ao mudar o responsável
      params.set('page', '1')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname],
  )

  // Ordenação: lido direto da URL, atualiza URL ao mudar
  const sortFromUrl = searchParams.get('sort') ?? 'recent'

  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'recent') {
        params.delete('sort')
      } else {
        params.set('sort', value)
      }
      // Sempre resetar para página 1 ao mudar a ordenação
      params.set('page', '1')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname],
  )

  // Para badges: verificar se há filtros ativos incluindo search e assignedTo
  const hasAnyActiveFilter =
    activeFilterCount > 0 ||
    !!searchParams.get('search') ||
    (assignedToFromUrl !== 'all' && !isMember)

  return (
    <div className="flex flex-col gap-3">
      {/* Linha 1: Search com largura total */}
      <div className="relative w-full">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchInputValue}
          onChange={(event) => setSearchInputValue(event.target.value)}
          className="pl-9"
        />
      </div>

      {/* Linha 2: Select Responsável + Select Ordenação + Filtros + Importar + Criar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Select de Ordenação */}
        <Select value={sortFromUrl} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[300px]">
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigos</SelectItem>
            <SelectItem value="nameAsc">Nome A-Z</SelectItem>
            <SelectItem value="nameDesc">Nome Z-A</SelectItem>
          </SelectContent>
        </Select>

        {/* Select de Responsável */}
        <Select
          value={isMember ? currentUserId : assignedToFromUrl}
          onValueChange={handleAssigneeChange}
          disabled={isMember}
        >
          <SelectTrigger className="w-[300px]">
            <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            {!isMember && (
              <SelectItem value="all">Todos os responsáveis</SelectItem>
            )}
            {members.map((member) => (
              <SelectItem
                key={member.userId ?? member.id}
                value={member.userId ?? currentUserId}
              >
                {member.user?.fullName || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botão Filtros Avançados */}
        <ContactsFiltersSheet
          companyOptions={companyOptions}
          filters={filters}
          onApplyFilters={onApplyFilters}
          activeFilterCount={activeFilterCount}
        />

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/org/${orgSlug}/contacts/import`}>
              <UploadIcon className="mr-2 h-4 w-4" />
              Importar
            </Link>
          </Button>

          <CreateContactButton
            companyOptions={companyOptions}
            withinQuota={withinQuota}
          />
        </div>
      </div>

      {/* Linha 3: Badges de filtros ativos (apenas quando há filtros) */}
      {hasAnyActiveFilter && (
        <ContactFilterBadges
          filters={filters}
          companyOptions={companyOptions}
          onFiltersChange={onApplyFilters}
          onClearFilters={onClearFilters}
          hasActiveFilters={activeFilterCount > 0}
        />
      )}
    </div>
  )
}
