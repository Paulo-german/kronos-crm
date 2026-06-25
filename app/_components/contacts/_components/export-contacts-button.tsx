'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Download } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { exportContacts } from '@/_actions/contact/export-contacts'
import type { ContactFilters } from '../_lib/contact-filters'

interface ExportContactsButtonProps {
  filters: ContactFilters
  search: string
  /** Responsável selecionado (só aplicado para ADMIN/OWNER) */
  assignedTo?: string
}

export function ExportContactsButton({
  filters,
  search,
  assignedTo,
}: ExportContactsButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { execute, isPending } = useAction(exportContacts, {
    onSuccess: ({ data }) => {
      if (!data) return

      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const fileName = `contacts-export-${format(new Date(), 'yyyy-MM-dd')}.csv`

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()

      URL.revokeObjectURL(url)

      setIsDialogOpen(false)
      toast.success(`Exportação concluída: ${data.count} contatos`)
    },
    onError: () => {
      toast.error('Erro ao exportar contatos')
    },
  })

  function handleConfirmExport() {
    execute({
      search,
      assignedTo,
      companyId: filters.companyId ?? undefined,
      isDecisionMaker: filters.isDecisionMaker ?? undefined,
      hasDeals: filters.hasDeals ?? undefined,
      lifecycleStages: filters.lifecycleStages,
      customerStatuses: filters.customerStatuses,
      healthScoreMin: filters.healthScoreMin ?? undefined,
      healthScoreMax: filters.healthScoreMax ?? undefined,
    })
  }

  const hasFilters =
    !!search ||
    !!assignedTo ||
    !!filters.companyId ||
    filters.isDecisionMaker != null ||
    filters.hasDeals != null ||
    filters.lifecycleStages.length > 0 ||
    filters.customerStatuses.length > 0 ||
    filters.healthScoreMin != null ||
    filters.healthScoreMax != null

  return (
    <>
      <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
        <Download className="mr-2 h-4 w-4" />
        Exportar
      </Button>

      <ConfirmationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Exportar contatos"
        description={
          <p>
            O arquivo CSV incluirá{' '}
            <span className="font-semibold text-foreground">
              todos os contatos
            </span>{' '}
            que correspondem aos filtros aplicados, não apenas os exibidos na
            página atual.
            {!hasFilters && (
              <>
                {' '}
                Nenhum filtro está ativo, então{' '}
                <span className="font-semibold text-foreground">
                  todos os seus contatos
                </span>{' '}
                serão exportados.
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
