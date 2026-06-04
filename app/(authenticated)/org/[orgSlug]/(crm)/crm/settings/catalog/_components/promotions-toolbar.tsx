'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { PlusIcon, PowerIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'

const SEARCH_DEBOUNCE_MS = 300

interface PromotionsToolbarProps {
  onNew: () => void
}

export function PromotionsToolbar({ onNew }: PromotionsToolbarProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [searchInputValue, setSearchInputValue] = useState(
    () => searchParams.get('pr_search') ?? '',
  )

  const searchFromUrl = searchParams.get('pr_search') ?? ''
  useEffect(() => {
    setSearchInputValue(searchFromUrl)
  }, [searchFromUrl])

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchInputValue.trim()) {
        params.set('pr_search', searchInputValue.trim())
      } else {
        params.delete('pr_search')
      }
      params.set('pr_page', '1')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInputValue, router, pathname])

  const statusFromUrl = searchParams.get('pr_status') ?? 'all'

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('pr_status')
    } else {
      params.set('pr_status', value)
    }
    params.set('pr_page', '1')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome da promoção..."
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
          <Button variant="default" onClick={onNew}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Nova Promoção
          </Button>
        </div>
      </div>
    </div>
  )
}
