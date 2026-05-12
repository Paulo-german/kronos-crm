'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { PowerIcon, SearchIcon } from 'lucide-react'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import CreateProductButton from './create-product-button'

const SEARCH_DEBOUNCE_MS = 300

interface ProductsToolbarProps {
  withinQuota: boolean
}

export function ProductsToolbar({ withinQuota }: ProductsToolbarProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [searchInputValue, setSearchInputValue] = useState(
    () => searchParams.get('p_search') ?? '',
  )

  const searchFromUrl = searchParams.get('p_search') ?? ''
  useEffect(() => {
    setSearchInputValue(searchFromUrl)
  }, [searchFromUrl])

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchInputValue.trim()) {
        params.set('p_search', searchInputValue.trim())
      } else {
        params.delete('p_search')
      }
      params.set('p_page', '1')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInputValue, router, pathname])

  const statusFromUrl = searchParams.get('p_status') ?? 'all'

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('p_status')
    } else {
      params.set('p_status', value)
    }
    params.set('p_page', '1')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome do produto..."
          value={searchInputValue}
          onChange={(event) => setSearchInputValue(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

        <div className="ml-auto">
          <CreateProductButton withinQuota={withinQuota} />
        </div>
      </div>
    </div>
  )
}
