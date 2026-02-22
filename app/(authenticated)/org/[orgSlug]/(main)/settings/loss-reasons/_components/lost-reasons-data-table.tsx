'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { PackageIcon, BarChart3Icon, ToggleLeftIcon } from 'lucide-react'
import { DataTable } from '@/_components/data-table'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import LostReasonTableDropdown from './table-dropdown-menu'
import { Dialog } from '@/_components/ui/dialog'
import { useAction } from 'next-safe-action/hooks'
import { deleteLostReason } from '@/_actions/settings/lost-reasons/delete'
import { updateLostReason } from '@/_actions/settings/lost-reasons/update'
import { toast } from 'sonner'
import UpsertLostReasonDialog from './upsert-lost-reason-dialog'

interface LostReason {
  id: string
  name: string
  isActive: boolean
  _count: {
    deals: number
  }
}

interface LostReasonsDataTableProps {
  reasons: LostReason[]
}

export function LostReasonsDataTable({ reasons }: LostReasonsDataTableProps) {
  const [localReasons, setLocalReasons] = useState(reasons)
  const [editingReason, setEditingReason] = useState<LostReason | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const { execute: executeDelete } = useAction(
    deleteLostReason,
    {
      onSuccess: ({ input }) => {
        toast.success('Motivo excluído com sucesso.')
        setLocalReasons((prev) => prev.filter((r) => r.id !== input.id))
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir motivo.')
      },
    },
  )

  const { execute: executeToggle } = useAction(updateLostReason, {
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar status.')
    },
  })

  const handleEdit = (reason: LostReason) => {
    setEditingReason(reason)
    setIsEditDialogOpen(true)
  }

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    // Optimistic update
    setLocalReasons((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !currentStatus } : r)),
    )
    executeToggle({ id, isActive: !currentStatus })
  }

  const columns: ColumnDef<LostReason>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <PackageIcon className="h-4 w-4 text-muted-foreground" />
          <span>Motivo</span>
        </div>
      ),
      cell: ({ row }) => {
        return <span className="ml-2 font-medium">{row.getValue('name')}</span>
      },
    },
    {
      accessorKey: '_count',
      header: () => (
        <div className="flex items-center gap-2">
          <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          <span>Deals Perdidos</span>
        </div>
      ),
      cell: ({ row }) => {
        const count = row.original._count.deals
        return <Badge variant="secondary">{count}</Badge>
      },
    },
    {
      accessorKey: 'isActive',
      header: () => (
        <div className="flex items-center gap-2">
          <ToggleLeftIcon className="h-4 w-4 text-muted-foreground" />
          <span>Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const reason = row.original
        return (
          <Switch
            checked={reason.isActive}
            onCheckedChange={() =>
              handleToggleActive(reason.id, reason.isActive)
            }
          />
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const reason = row.original
        return (
          <LostReasonTableDropdown
            reason={reason}
            onDelete={() => executeDelete({ id: reason.id })}
            onEdit={() => handleEdit(reason)}
          />
        )
      },
    },
  ]

  return (
    <>
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setEditingReason(null)
        }}
      >
        {editingReason && (
          <UpsertLostReasonDialog
            key={editingReason.id}
            defaultValues={{
              id: editingReason.id,
              name: editingReason.name,
            }}
            setIsOpen={setIsEditDialogOpen}
            isOpen={isEditDialogOpen}
          />
        )}
      </Dialog>

      <DataTable
        columns={columns}
        data={localReasons}
        enableSelection={false}
      />
    </>
  )
}
