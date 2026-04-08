'use client'

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
import { PAGE_SIZE_OPTIONS } from '../_lib/deal-list-params'

interface DealsPaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
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

  for (let pageNum = rangeStart; pageNum <= rangeEnd; pageNum++) {
    pages.push(pageNum)
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis')
  }

  pages.push(totalPages)

  return pages
}

export function DealsPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: DealsPaginationProps) {
  const handlePageSizeChange = useCallback(
    (newPageSize: string) => {
      onPageSizeChange(Number(newPageSize))
    },
    [onPageSizeChange],
  )

  // Cálculo do intervalo exibido
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const visiblePages = getVisiblePages(page, totalPages)

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
      {/* Legenda: Mostrando X-Y de Z negociações */}
      <p className="shrink-0 text-sm text-muted-foreground">
        {total === 0 ? (
          'Nenhuma negociação encontrada'
        ) : (
          <>
            Mostrando{' '}
            <span className="font-medium text-foreground">{rangeStart}</span>
            {' – '}
            <span className="font-medium text-foreground">{rangeEnd}</span>
            {' de '}
            <span className="font-medium text-foreground">{total}</span>
            {' '}
            {total === 1 ? 'negociação' : 'negociações'}
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
                href="#"
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (page <= 1) return
                  onPageChange(page - 1)
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
                    href="#"
                    isActive={pageItem === page}
                    onClick={(event) => {
                      event.preventDefault()
                      onPageChange(pageItem)
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
                href="#"
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (page >= totalPages) return
                  onPageChange(page + 1)
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
