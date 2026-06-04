'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { SearchIcon, TagIcon, PowerIcon } from 'lucide-react'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'
import ManageCategoriesSheet from './manage-categories-sheet'
import CreateServiceButton from './create-service-button'

const SEARCH_DEBOUNCE_MS = 300

interface ServicesToolbarProps {
  categories: ServiceCategoryDto[]
  professionals: ProfessionalDto[]
}

export function ServicesToolbar({ categories, professionals }: ServicesToolbarProps) {
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
  // useEffect justificado aqui: sincronização com sistema externo (URL)
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

  // Categoria: lida direto da URL, atualiza URL ao mudar
  const categoryFromUrl = searchParams.get('categoryId') ?? 'all'

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('categoryId')
    } else {
      params.set('categoryId', value)
    }
    params.set('page', '1')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Status: lido direto da URL, atualiza URL ao mudar
  const statusFromUrl = searchParams.get('status') ?? 'all'

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    params.set('page', '1')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Linha 1: Search com largura total */}
      <div className="relative w-full">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome do serviço..."
          value={searchInputValue}
          onChange={(event) => setSearchInputValue(event.target.value)}
          className="pl-9"
        />
      </div>

      {/* Linha 2: Filtros + ações */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Select de Categoria */}
        <Select
          value={categoryFromUrl}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[220px]">
            <TagIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Select de Status */}
        <Select value={statusFromUrl} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <PowerIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <ManageCategoriesSheet categories={categories} />
          <CreateServiceButton categories={categories} professionals={professionals} />
        </div>
      </div>
    </div>
  )
}
