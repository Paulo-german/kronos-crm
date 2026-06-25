'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface BroadcastsPaginationProps {
  page: number
  totalPages: number
}

export const BroadcastsPagination = ({
  page,
  totalPages,
}: BroadcastsPaginationProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  if (totalPages <= 1) return null

  const goTo = (target: number) => {
    const next = new URLSearchParams(params.toString())
    next.set('page', String(target))
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
        >
          Próxima
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
