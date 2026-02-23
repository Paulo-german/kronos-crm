'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import {
  PackageIcon,
  BarChart3Icon,
  ToggleLeftIcon,
  TrashIcon,
  Loader2,
} from 'lucide-react'
import { DataTable } from '@/_components/data-table'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Sheet } from '@/_components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Label } from '@/_components/ui/label'
import LostReasonTableDropdown from './table-dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
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
  const router = useRouter()
  const [localReasons, setLocalReasons] = useState(reasons)
  const [editingReason, setEditingReason] = useState<LostReason | null>(null)

  // Sincroniza estado local quando o servidor retorna dados atualizados (router.refresh)
  useEffect(() => {
    setLocalReasons(reasons)
  }, [reasons])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deletingReason, setDeletingReason] = useState<LostReason | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [replacementId, setReplacementId] = useState<string | null>(null)

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteLostReason,
    {
      onSuccess: () => {
        toast.success('Motivo excluído com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingReason(null)
        setReplacementId(null)
        router.refresh()
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

  const handleDeleteClick = (reason: LostReason) => {
    setDeletingReason(reason)
    setReplacementId(null)
    setIsDeleteDialogOpen(true)
  }

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    // Optimistic update
    setLocalReasons((prev) =>
      prev.map((reason) =>
        reason.id === id ? { ...reason, isActive: !currentStatus } : reason,
      ),
    )
    executeToggle({ id, isActive: !currentStatus })
  }

  const handleConfirmDelete = () => {
    if (!deletingReason) return
    executeDelete({
      id: deletingReason.id,
      replacementId,
    })
  }

  // Motivos disponíveis para substituição (ativos, excluindo o que será deletado)
  const replacementOptions = localReasons.filter(
    (reason) => reason.id !== deletingReason?.id && reason.isActive,
  )

  const hasDeals = (deletingReason?._count.deals ?? 0) > 0

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
            onDelete={() => handleDeleteClick(reason)}
            onEdit={() => handleEdit(reason)}
          />
        )
      },
    },
  ]

  return (
    <>
      {/* Sheet de edição */}
      <Sheet
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
      </Sheet>

      {/* Dialog de exclusão simples (sem deals) */}
      {deletingReason && !hasDeals && (
        <ConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open) {
              setDeletingReason(null)
              setReplacementId(null)
            }
          }}
          title="Excluir motivo de perda?"
          description={
            <p>
              Tem certeza que deseja excluir o motivo{' '}
              <strong className="font-semibold text-foreground">
                {deletingReason.name}
              </strong>
              ? Esta ação não pode ser desfeita.
            </p>
          }
          icon={<TrashIcon />}
          variant="destructive"
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          confirmLabel="Confirmar Exclusão"
        />
      )}

      {/* Dialog de exclusão com substituição (com deals) */}
      {deletingReason && hasDeals && (
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open) {
              setDeletingReason(null)
              setReplacementId(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-destructive/20 text-destructive">
                  <TrashIcon className="h-6 w-6" />
                </div>
                Excluir motivo de perda?
              </DialogTitle>
              <DialogDescription className="text-center">
                O motivo{' '}
                <strong className="font-semibold text-foreground">
                  {deletingReason.name}
                </strong>{' '}
                está associado a{' '}
                <strong className="font-semibold text-foreground">
                  {deletingReason._count.deals}{' '}
                  {deletingReason._count.deals === 1
                    ? 'negociação perdida'
                    : 'negociações perdidas'}
                </strong>
                . Escolha um motivo substituto ou remova a associação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <Label htmlFor="replacement-reason">Motivo substituto</Label>
              <Select
                value={replacementId ?? 'none'}
                onValueChange={(value) =>
                  setReplacementId(value === 'none' ? null : value)
                }
              >
                <SelectTrigger id="replacement-reason">
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Nenhum (remover associação)
                  </SelectItem>
                  {replacementOptions.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setDeletingReason(null)
                  setReplacementId(null)
                }}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar Exclusão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <DataTable
        columns={columns}
        data={localReasons}
        enableSelection={false}
      />
    </>
  )
}
