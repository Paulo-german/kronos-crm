'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Download } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { exportDeals } from '@/_actions/deal/export-deals'

interface ExportDealsButtonProps {
  filters: {
    search: string
    status: string[]
    priority: string[]
    assignedTo?: string
    dateFrom?: string | null
    dateTo?: string | null
    valueMin?: number | null
    valueMax?: number | null
    sort: string
    pipelineId?: string
  }
}

export function ExportDealsButton({ filters }: ExportDealsButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { execute, isPending } = useAction(exportDeals, {
    onSuccess: ({ data }) => {
      if (!data) return

      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const fileName = `deals-export-${format(new Date(), 'yyyy-MM-dd')}.csv`

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()

      URL.revokeObjectURL(url)

      setIsDialogOpen(false)
      toast.success(`Exportação concluída: ${data.count} negociações`)
    },
    onError: () => {
      toast.error('Erro ao exportar negociações')
    },
  })

  function handleConfirmExport() {
    execute({
      search: filters.search,
      status: filters.status as ('OPEN' | 'IN_PROGRESS' | 'WON' | 'LOST' | 'PAUSED')[],
      priority: filters.priority as ('low' | 'medium' | 'high' | 'urgent')[],
      assignedTo: filters.assignedTo,
      dateFrom: filters.dateFrom ?? undefined,
      dateTo: filters.dateTo ?? undefined,
      valueMin: filters.valueMin ?? undefined,
      valueMax: filters.valueMax ?? undefined,
      sort: filters.sort as
        | 'created-desc'
        | 'created-asc'
        | 'value-desc'
        | 'value-asc'
        | 'priority-desc'
        | 'title-asc',
      pipelineId: filters.pipelineId,
    })
  }

  const hasFilters =
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    !!filters.assignedTo ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    filters.valueMin != null ||
    filters.valueMax != null ||
    !!filters.search

  return (
    <>
      <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
        <Download />
        Exportar
      </Button>

      <ConfirmationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Exportar negociações"
        description={
          <p>
            O arquivo CSV incluirá{' '}
            <span className="font-semibold text-foreground">
              todas as negociações
            </span>{' '}
            que correspondem aos filtros aplicados, não apenas as exibidas na
            página atual.
            {!hasFilters && (
              <>
                {' '}
                Nenhum filtro está ativo, então{' '}
                <span className="font-semibold text-foreground">
                  todas as suas negociações
                </span>{' '}
                serão exportadas.
              </>
            )}
          </p>
        }
        icon={<Download />}
        onConfirm={handleConfirmExport}
        isLoading={isPending}
        confirmLabel="Exportar CSV"
      />
    </>
  )
}
