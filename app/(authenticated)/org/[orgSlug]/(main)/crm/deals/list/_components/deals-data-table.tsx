'use client'

import { useState, useCallback } from 'react'
import { TrashIcon } from 'lucide-react'
import { Checkbox } from '@/_components/ui/checkbox'
import { Button } from '@/_components/ui/button'
import { DealCardRow } from './deal-card-row'
import type { DealListDto } from '@/_data-access/deal/get-deals'

interface DealsDataTableProps {
  deals: DealListDto[]
  onEdit: (deal: DealListDto) => void
  onDelete: (deal: DealListDto) => void
  onBulkDelete: (ids: string[]) => void
  orgSlug: string
}

export function DealsDataTable({
  deals,
  onEdit,
  onDelete,
  onBulkDelete,
  orgSlug,
}: DealsDataTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isAllSelected =
    deals.length > 0 && deals.every((deal) => selectedIds.has(deal.id))

  const isIndeterminate =
    !isAllSelected && deals.some((deal) => selectedIds.has(deal.id))

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(deals.map((deal) => deal.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [deals],
  )

  const handleSelectionChange = useCallback((id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleBulkDelete = () => {
    onBulkDelete(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  if (deals.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          Nenhuma negociação encontrada com os filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Cabeçalho com select all e bulk actions */}
      <div className="flex items-center gap-3 rounded-lg px-4 py-2">
        <Checkbox
          checked={isIndeterminate ? 'indeterminate' : isAllSelected}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
          aria-label="Selecionar todas as negociações"
        />
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size}{' '}
              {selectedIds.size === 1
                ? 'negociação selecionada'
                : 'negociações selecionadas'}
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleBulkDelete}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Excluir selecionadas
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {deals.length}{' '}
            {deals.length === 1 ? 'negociação' : 'negociações'}
          </span>
        )}
      </div>

      {/* Lista de cards */}
      <div className="flex flex-col gap-1.5">
        {deals.map((deal) => (
          <DealCardRow
            key={deal.id}
            deal={deal}
            isSelected={selectedIds.has(deal.id)}
            onSelectionChange={(checked) =>
              handleSelectionChange(deal.id, checked)
            }
            onEdit={() => onEdit(deal)}
            onDelete={() => onDelete(deal)}
            orgSlug={orgSlug}
          />
        ))}
      </div>
    </div>
  )
}
