'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import {
  BriefcaseIcon,
  KanbanIcon,
  CircleDotIcon,
  FlagIcon,
  UserIcon,
  Building2Icon,
  DollarSignIcon,
  CalendarIcon,
  UserCogIcon,
  TrashIcon,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { CircleIcon } from 'lucide-react'
import { DataTable } from '@/_components/data-table'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { updateDeal } from '@/_actions/deal/update-deal'
import { deleteDeal } from '@/_actions/deal/delete-deal'
import { bulkDeleteDeals } from '@/_actions/deal/bulk-delete-deals'
import { formatCurrency } from '@/_utils/format-currency'
import { DealDialogContent } from '../../_components/deal-dialog-content'
import DealTableDropdownMenu from './deal-table-dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import type { DealListDto } from '@/_data-access/deal/get-deals'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { DealStatus, DealPriority, MemberRole } from '@prisma/client'

interface MemberDto {
  id: string
  userId: string | null
  email: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
}

interface DealsDataTableProps {
  deals: DealListDto[]
  stages: StageDto[]
  contacts: ContactDto[]
  members: MemberDto[]
  currentUserId: string
  userRole: MemberRole
}

const STATUS_CONFIG: Record<DealStatus, { label: string; color: string }> = {
  OPEN: {
    label: 'NOVO',
    color:
      'bg-kronos-blue/10 text-kronos-blue border border-kronos-blue/20',
  },
  IN_PROGRESS: {
    label: 'EM ANDAMENTO',
    color:
      'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20',
  },
  WON: {
    label: 'VENDIDO',
    color:
      'bg-kronos-green/10 text-kronos-green border-kronos-green/20',
  },
  LOST: {
    label: 'PERDIDO',
    color:
      'bg-kronos-red/10 text-kronos-red border-kronos-red/20',
  },
  PAUSED: {
    label: 'PAUSADO',
    color:
      'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20',
  },
}

const PRIORITY_CONFIG: Record<DealPriority, { label: string; color: string }> = {
  low: {
    label: 'BAIXA',
    color: 'border-muted-foreground/30 text-muted-foreground',
  },
  medium: {
    label: 'MÉDIA',
    color: 'border-kronos-blue/40 text-kronos-blue',
  },
  high: {
    label: 'ALTA',
    color: 'border-kronos-yellow/40 text-kronos-yellow',
  },
  urgent: {
    label: 'URGENTE',
    color: 'border-kronos-red/40 text-kronos-red',
  },
}

export function DealsDataTable({
  deals,
  stages,
  contacts,
}: DealsDataTableProps) {
  // Estado do Sheet de edição (elevado para sobreviver ao re-render da tabela)
  const [editingDeal, setEditingDeal] = useState<DealListDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  // Estado do dialog de deleção individual
  const [deletingDeal, setDeletingDeal] = useState<DealListDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  // Estado do dialog de deleção em massa
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  // Hook para atualizar deal
  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateDeal,
    {
      onSuccess: () => {
        toast.success('Deal atualizado com sucesso!')
        setIsEditSheetOpen(false)
        setEditingDeal(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar deal.')
      },
    },
  )

  // Hook para deletar individualmente
  const { execute: executeDelete, isExecuting: isDeletingIndividual } =
    useAction(deleteDeal, {
      onSuccess: () => {
        toast.success('Deal excluído com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingDeal(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir deal.')
      },
    })

  // Hook para deletar em massa
  const { execute: executeBulkDelete, isExecuting: isDeleting } = useAction(
    bulkDeleteDeals,
    {
      onSuccess: ({ data }) => {
        toast.success(
          `${data?.count || 1} negociação(ões) excluída(s) com sucesso.`,
        )
        setIsBulkDeleteOpen(false)
        resetSelectionRef.current?.()
      },
      onError: () => {
        toast.error('Erro ao excluir negociações.')
      },
    },
  )

  const handleEdit = (deal: DealListDto) => {
    setEditingDeal(deal)
    setIsEditSheetOpen(true)
  }

  const columns: ColumnDef<DealListDto>[] = [
    {
      accessorKey: 'title',
      header: () => (
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
          <span>Título</span>
        </div>
      ),
      cell: ({ row }) => {
        const deal = row.original
        return (
          <Link
            href={`/crm/deals/${deal.id}`}
            className="ml-2 font-medium hover:underline"
          >
            {deal.title}
          </Link>
        )
      },
    },
    {
      accessorKey: 'stageName',
      header: () => (
        <div className="flex items-center gap-2">
          <KanbanIcon className="h-4 w-4 text-muted-foreground" />
          <span>Etapa</span>
        </div>
      ),
      cell: ({ row }) => row.getValue('stageName') as string,
    },
    {
      accessorKey: 'status',
      header: () => (
        <div className="flex items-center gap-2">
          <CircleDotIcon className="h-4 w-4 text-muted-foreground" />
          <span>Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as DealStatus
        const config = STATUS_CONFIG[status]
        return (
          <Badge
            variant="outline"
            className={`gap-1.5 px-2 text-[10px] font-semibold ${config.color}`}
          >
            <CircleIcon className="h-1.5 w-1.5 fill-current" />
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: () => (
        <div className="flex items-center gap-2">
          <FlagIcon className="h-4 w-4 text-muted-foreground" />
          <span>Prioridade</span>
        </div>
      ),
      cell: ({ row }) => {
        const priority = row.getValue('priority') as DealPriority
        const config = PRIORITY_CONFIG[priority]
        return (
          <Badge
            variant="outline"
            className={`bg-transparent px-2 text-[10px] font-semibold ${config.color}`}
          >
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'contactName',
      header: () => (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span>Contato</span>
        </div>
      ),
      cell: ({ row }) => {
        const contactName = row.getValue('contactName') as string | null
        if (!contactName)
          return <span className="text-muted-foreground">—</span>
        return contactName
      },
    },
    {
      accessorKey: 'companyName',
      header: () => (
        <div className="flex items-center gap-2">
          <Building2Icon className="h-4 w-4 text-muted-foreground" />
          <span>Empresa</span>
        </div>
      ),
      cell: ({ row }) => {
        const companyName = row.getValue('companyName') as string | null
        if (!companyName)
          return <span className="text-muted-foreground">—</span>
        return companyName
      },
    },
    {
      accessorKey: 'totalValue',
      header: () => (
        <div className="flex items-center gap-2">
          <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          <span>Valor</span>
        </div>
      ),
      cell: ({ row }) => {
        const value = row.getValue('totalValue') as number
        return formatCurrency(value)
      },
    },
    {
      accessorKey: 'expectedCloseDate',
      header: () => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>Fech. Previsto</span>
        </div>
      ),
      cell: ({ row }) => {
        const date = row.getValue('expectedCloseDate') as Date | null
        if (!date) return <span className="text-muted-foreground">—</span>
        return new Date(date).toLocaleDateString('pt-BR')
      },
    },
    {
      accessorKey: 'assigneeName',
      header: () => (
        <div className="flex items-center gap-2">
          <UserCogIcon className="h-4 w-4 text-muted-foreground" />
          <span>Responsável</span>
        </div>
      ),
      cell: ({ row }) => {
        const name = row.getValue('assigneeName') as string | null
        if (!name) return <span className="text-muted-foreground">—</span>
        return name
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const deal = row.original
        return (
          <DealTableDropdownMenu
            onEdit={() => handleEdit(deal)}
            onDelete={() => {
              setDeletingDeal(deal)
              setIsDeleteDialogOpen(true)
            }}
          />
        )
      },
    },
  ]

  return (
    <>
      {/* Sheet de edição fora da tabela para sobreviver ao re-render */}
      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open)
          if (!open) setEditingDeal(null)
        }}
      >
        {editingDeal && (
          <DealDialogContent
            key={editingDeal.id}
            defaultValues={{
              id: editingDeal.id,
              title: editingDeal.title,
              stageId: editingDeal.stageId,
              contactId: editingDeal.contactId || undefined,
              companyId: editingDeal.companyId || undefined,
              expectedCloseDate: editingDeal.expectedCloseDate
                ? new Date(editingDeal.expectedCloseDate)
                : undefined,
            }}
            stages={stages}
            contacts={contacts}
            setIsOpen={setIsEditSheetOpen}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      {/* Dialog de deleção individual */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingDeal(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente a negociação{' '}
            <span className="font-bold text-foreground">
              {deletingDeal?.title}
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingDeal) executeDelete({ id: deletingDeal.id })
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Dialog de deleção em massa */}
      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Excluir negociações selecionadas?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            <br />
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} negociações permanentemente do sistema.
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => executeBulkDelete({ ids: bulkDeleteIds })}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      <DataTable
        columns={columns}
        data={deals}
        enableSelection={true}
        bulkActions={({ selectedRows, resetSelection }) => {
          resetSelectionRef.current = resetSelection
          return (
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => {
                setBulkDeleteIds(selectedRows.map((row) => row.id))
                setIsBulkDeleteOpen(true)
              }}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Deletar
            </Button>
          )
        }}
      />
    </>
  )
}
