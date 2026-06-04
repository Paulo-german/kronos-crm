'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/_components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { PAGE_SIZE_OPTIONS } from '../_lib/contact-list-params'

interface ContactsPaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Calcula os números de página visíveis com ellipsis */
function getVisiblePages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (currentPage > 3) {
    pages.push('ellipsis')
  }

  const rangeStart = Math.max(2, currentPage - 1)
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1)

  for (let page = rangeStart; page <= rangeEnd; page++) {
    pages.push(page)
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis')
  }

  pages.push(totalPages)

  return pages
}

export function ContactsPagination({
  page,
  pageSize,
  total,
  totalPages,
}: ContactsPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const buildUrl = useCallback(
    (newPage: number, newPageSize?: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(newPage))
      if (newPageSize !== undefined) {
        params.set('pageSize', String(newPageSize))
      }
      return `${pathname}?${params.toString()}`
    },
    [searchParams, pathname],
  )

  const handlePageSizeChange = useCallback(
    (newPageSize: string) => {
      // Ao mudar o tamanho da página, voltar para página 1
      router.replace(buildUrl(1, Number(newPageSize)), { scroll: false })
    },
    [router, buildUrl],
  )

  // Cálculo do intervalo exibido
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const visiblePages = getVisiblePages(page, totalPages)

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
      {/* Legenda: Mostrando X-Y de Z contatos */}
      <p className="shrink-0 text-sm text-muted-foreground">
        {total === 0 ? (
          'Nenhum contato encontrado'
        ) : (
          <>
            Mostrando{' '}
            <span className="font-medium text-foreground">{rangeStart}</span>
            {' – '}
            <span className="font-medium text-foreground">{rangeEnd}</span>
            {' de '}
            <span className="font-medium text-foreground">{total}</span>
            {' '}
            {total === 1 ? 'contato' : 'contatos'}
          </>
        )}
      </p>

      {/* Navegação central */}
      {totalPages > 1 && (
        <Pagination className="flex-1">
          <PaginationContent>
            {/* Botão Anterior */}
            <PaginationItem>
              <PaginationPrevious
                href={page > 1 ? buildUrl(page - 1) : undefined}
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                onClick={(event) => {
                  if (page <= 1) return
                  event.preventDefault()
                  router.replace(buildUrl(page - 1), { scroll: false })
                }}
              />
            </PaginationItem>

            {/* Números de página */}
            {visiblePages.map((pageItem, index) => {
              if (pageItem === 'ellipsis') {
                return (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              }

              return (
                <PaginationItem key={pageItem}>
                  <PaginationLink
                    href={buildUrl(pageItem)}
                    isActive={pageItem === page}
                    onClick={(event) => {
                      event.preventDefault()
                      router.replace(buildUrl(pageItem), { scroll: false })
                    }}
                  >
                    {pageItem}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            {/* Botão Próximo */}
            <PaginationItem>
              <PaginationNext
                href={page < totalPages ? buildUrl(page + 1) : undefined}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                onClick={(event) => {
                  if (page >= totalPages) return
                  event.preventDefault()
                  router.replace(buildUrl(page + 1), { scroll: false })
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Select de pageSize */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm text-muted-foreground">Por página:</span>
        <Select
          value={String(pageSize)}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger className="w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
