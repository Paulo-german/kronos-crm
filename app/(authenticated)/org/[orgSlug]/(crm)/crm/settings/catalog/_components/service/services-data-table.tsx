'use client'

import { useState, useCallback } from 'react'
import { TrashIcon } from 'lucide-react'
import { Checkbox } from '@/_components/ui/checkbox'
import { Button } from '@/_components/ui/button'
import { ServiceCardRow } from './service-card-row'
import type { ServiceDto } from '@/_data-access/service/get-services'

interface ServicesDataTableProps {
  services: ServiceDto[]
  onEdit: (service: ServiceDto) => void
  onDelete: (service: ServiceDto) => void
  onBulkDelete: (ids: string[], resetSelection: () => void) => void
}

export function ServicesDataTable({
  services,
  onEdit,
  onDelete,
  onBulkDelete,
}: ServicesDataTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isAllSelected =
    services.length > 0 && services.every((service) => selectedIds.has(service.id))

  const isIndeterminate =
    !isAllSelected && services.some((service) => selectedIds.has(service.id))

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(services.map((service) => service.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [services],
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

  const resetSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkDelete = () => {
    onBulkDelete(Array.from(selectedIds), resetSelection)
  }

  if (services.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          Nenhum serviço encontrado com os filtros aplicados.
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
          aria-label="Selecionar todos os serviços"
        />
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'serviço selecionado' : 'serviços selecionados'}
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleBulkDelete}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Remover selecionados
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {services.length}{' '}
            {services.length === 1 ? 'serviço' : 'serviços'}
          </span>
        )}
      </div>

      {/* Lista de cards */}
      <div className="flex flex-col gap-1.5">
        {services.map((service) => (
          <ServiceCardRow
            key={service.id}
            service={service}
            isSelected={selectedIds.has(service.id)}
            onSelectionChange={(checked) => handleSelectionChange(service.id, checked)}
            onEdit={() => onEdit(service)}
            onDelete={() => onDelete(service)}
          />
        ))}
      </div>
    </div>
  )
}
