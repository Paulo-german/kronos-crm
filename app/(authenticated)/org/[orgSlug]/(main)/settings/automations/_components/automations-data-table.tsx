'use client'

import { useState, useRef, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  ZapIcon,
  ClockIcon,
  PlayCircleIcon,
  UserIcon,
  TrashIcon,
  ToggleRightIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { DataTable } from '@/_components/data-table'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { AutomationWizardSheet } from './automation-wizard-sheet'
import AutomationTableDropdownMenu from './table-dropdown-menu'
import { TRIGGER_LABELS, ACTION_LABELS } from './automation-labels'
import { toggleAutomation } from '@/_actions/automation/toggle-automation'
import { deleteAutomation } from '@/_actions/automation/delete-automation'
import { bulkDeleteAutomations } from '@/_actions/automation/bulk-delete-automations'
import { updateAutomation } from '@/_actions/automation/update-automation'
import { getAutomationDetail } from '@/_actions/automation/get-automation-detail'
import type { AutomationListItemDto } from '@/_data-access/automation/get-automations'
import type { UpdateAutomationInput } from '@/_actions/automation/update-automation/schema'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { DealLostReasonDto } from '@/_data-access/settings/get-lost-reasons'
import type { AutomationWizardEditData } from './wizard-form-types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AutomationsDataTableProps {
  automations: AutomationListItemDto[]
  orgSlug: string
  pipelines: OrgPipelineDto[]
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
  lossReasons: DealLostReasonDto[]
}

export function AutomationsDataTable({
  automations,
  orgSlug,
  pipelines,
  stageOptions,
  members,
  lossReasons,
}: AutomationsDataTableProps) {
  const [editingAutomation, setEditingAutomation] = useState<AutomationWizardEditData | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [deletingAutomation, setDeletingAutomation] = useState<AutomationListItemDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)
  // Flag de duplicação mantida em ref — não dispara re-render e sobrevive até o onSuccess da action
  const isDuplicateRef = useRef(false)

  const { execute: executeToggle } = useAction(toggleAutomation, {
    onSuccess: ({ input }) => {
      toast.success(input.isActive ? 'Automação ativada.' : 'Automação desativada.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao alterar status da automação.')
    },
  })

  const { execute: executeDelete, isExecuting: isDeletingIndividual } = useAction(deleteAutomation, {
    onSuccess: () => {
      toast.success('Automação excluída com sucesso.')
      setIsDeleteDialogOpen(false)
      setDeletingAutomation(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir automação.')
    },
  })

  const { execute: executeBulkDelete, isExecuting: isBulkDeleting } = useAction(bulkDeleteAutomations, {
    onSuccess: ({ data }) => {
      toast.success(`${data?.deleted ?? 'Automações'} excluídas com sucesso.`)
      setIsBulkDeleteOpen(false)
      resetSelectionRef.current?.()
    },
    onError: () => {
      toast.error('Erro ao excluir automações.')
    },
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(updateAutomation, {
    onSuccess: () => {
      toast.success('Automação atualizada com sucesso!')
      setIsEditSheetOpen(false)
      setEditingAutomation(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar automação.')
    },
  })

  const { execute: executeFetchDetail } = useAction(getAutomationDetail, {
    onSuccess: ({ data }) => {
      if (!data) return
      // isDuplicateRef é lido sincronamente no onSuccess — seguro pois a action é sequencial
      setEditingAutomation(
        isDuplicateRef.current
          ? { ...data, id: '', name: `${data.name} (cópia)` }
          : data,
      )
      setIsEditSheetOpen(true)
    },
    onError: () => {
      toast.error('Erro ao carregar dados da automação.')
    },
  })

  const handleEdit = (automation: AutomationListItemDto) => {
    isDuplicateRef.current = false
    executeFetchDetail({ id: automation.id })
  }

  const handleDuplicate = (automation: AutomationListItemDto) => {
    // Marca duplicação antes de disparar a action — lida no onSuccess
    isDuplicateRef.current = true
    executeFetchDetail({ id: automation.id })
  }

  const handleUpdate = (data: UpdateAutomationInput) => {
    executeUpdate(data)
  }

  // Callback estável para bulk actions — evita side-effect em render atribuindo resetSelection à ref
  const renderBulkActions = useCallback(
    ({
      selectedRows,
      resetSelection,
    }: {
      selectedRows: AutomationListItemDto[]
      resetSelection: () => void
    }) => {
      resetSelectionRef.current = resetSelection
      return (
        <Button
          variant="destructive"
          size="sm"
          className="h-8"
          onClick={() => {
            setBulkDeleteIds(selectedRows.map((automation) => automation.id))
            setIsBulkDeleteOpen(true)
          }}
        >
          <TrashIcon className="mr-2 h-4 w-4" />
          Excluir selecionadas
        </Button>
      )
    },
    [],
  )

  const columns: ColumnDef<AutomationListItemDto>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <ZapIcon className="h-4 w-4 text-muted-foreground" />
          <span>Nome</span>
        </div>
      ),
      cell: ({ row }) => (
        <Link
          href={`/org/${orgSlug}/settings/automations/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.getValue('name')}
        </Link>
      ),
    },
    {
      accessorKey: 'triggerType',
      header: () => (
        <div className="flex items-center gap-2">
          <ZapIcon className="h-4 w-4 text-muted-foreground" />
          <span>Gatilho</span>
        </div>
      ),
      cell: ({ row }) => {
        const trigger = row.getValue('triggerType') as AutomationListItemDto['triggerType']
        return (
          <Badge variant="secondary" className="text-xs font-normal">
            {TRIGGER_LABELS[trigger]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'actionType',
      header: () => (
        <div className="flex items-center gap-2">
          <PlayCircleIcon className="h-4 w-4 text-muted-foreground" />
          <span>Ação</span>
        </div>
      ),
      cell: ({ row }) => {
        const action = row.getValue('actionType') as AutomationListItemDto['actionType']
        return (
          <Badge variant="outline" className="text-xs font-normal">
            {ACTION_LABELS[action]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: () => (
        <div className="flex items-center gap-2">
          <ToggleRightIcon className="h-4 w-4 text-muted-foreground" />
          <span>Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const automation = row.original
        return (
          <Switch
            checked={automation.isActive}
            onCheckedChange={(checked) =>
              executeToggle({ id: automation.id, isActive: checked })
            }
            aria-label={automation.isActive ? 'Desativar automação' : 'Ativar automação'}
          />
        )
      },
    },
    {
      accessorKey: 'executionCount',
      header: () => (
        <div className="flex items-center gap-2">
          <PlayCircleIcon className="h-4 w-4 text-muted-foreground" />
          <span>Execuções</span>
        </div>
      ),
      cell: ({ row }) => {
        const count = row.getValue('executionCount') as number
        return (
          <span className="tabular-nums text-sm">
            {count.toLocaleString('pt-BR')}
          </span>
        )
      },
    },
    {
      accessorKey: 'lastTriggeredAt',
      header: () => (
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-muted-foreground" />
          <span>Última execução</span>
        </div>
      ),
      cell: ({ row }) => {
        const date = row.getValue('lastTriggeredAt') as Date | null
        if (!date) return <span className="text-muted-foreground text-sm">Nunca</span>
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })}
          </span>
        )
      },
    },
    {
      accessorKey: 'creator',
      header: () => (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span>Criado por</span>
        </div>
      ),
      cell: ({ row }) => {
        const creator = row.getValue('creator') as AutomationListItemDto['creator']
        return (
          <span className="text-sm text-muted-foreground">
            {creator.fullName ?? '—'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const automation = row.original
        return (
          <AutomationTableDropdownMenu
            onEdit={() => handleEdit(automation)}
            onDuplicate={() => handleDuplicate(automation)}
            onDelete={() => {
              setDeletingAutomation(automation)
              setIsDeleteDialogOpen(true)
            }}
          />
        )
      },
    },
  ]

  return (
    <>
      {/* Sheet de edição fora da tabela (sobrevive ao re-render) */}
      <AutomationWizardSheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open)
          if (!open) setEditingAutomation(null)
        }}
        pipelines={pipelines}
        stageOptions={stageOptions}
        members={members}
        lossReasons={lossReasons}
        editingAutomation={editingAutomation}
        onUpdate={handleUpdate}
        isUpdating={isUpdating}
      />

      {/* Dialog de deleção individual */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingAutomation(null)
        }}
        title="Excluir automação?"
        description={
          <p>
            Esta ação não pode ser desfeita. A automação{' '}
            <span className="font-bold text-foreground">{deletingAutomation?.name}</span>{' '}
            e todo o histórico de execuções serão removidos permanentemente.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingAutomation) executeDelete({ id: deletingAutomation.id })
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Dialog de deleção em massa */}
      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Excluir automações selecionadas?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} automação(ões)
            </span>{' '}
            permanentemente.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => executeBulkDelete({ ids: bulkDeleteIds })}
        isLoading={isBulkDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      <DataTable
        columns={columns}
        data={automations}
        enableSelection
        bulkActions={renderBulkActions}
      />
    </>
  )
}
