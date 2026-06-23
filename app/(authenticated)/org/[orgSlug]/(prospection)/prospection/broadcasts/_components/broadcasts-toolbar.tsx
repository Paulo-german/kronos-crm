'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import type { BroadcastStatus } from '@prisma/client'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { STATUS_LABELS } from '../../_lib/broadcast-labels'

const SEARCH_DEBOUNCE_MS = 350
const ALL_STATUSES = 'ALL'

const STATUSES: BroadcastStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'RUNNING',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
]

interface BroadcastsToolbarProps {
  search: string
  status?: BroadcastStatus
}

export const BroadcastsToolbar = ({
  search,
  status,
}: BroadcastsToolbarProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [value, setValue] = useState(search)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const pushParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString())
    Object.entries(updates).forEach(([key, val]) => {
      if (val) {
        next.set(key, val)
        return
      }
      next.delete(key)
    })
    // Qualquer mudança de filtro volta para a primeira página
    next.delete('page')
    router.push(`${pathname}?${next.toString()}`)
  }

  const handleSearch = (next: string) => {
    setValue(next)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => pushParams({ q: next.trim() || undefined }),
      SEARCH_DEBOUNCE_MS,
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Buscar por nome do disparo..."
          className="pl-8"
        />
      </div>
      <Select
        value={status ?? ALL_STATUSES}
        onValueChange={(next) =>
          pushParams({ status: next === ALL_STATUSES ? undefined : next })
        }
      >
        <SelectTrigger className="sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>Todos os status</SelectItem>
          {STATUSES.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
