'use client'

import { useState } from 'react'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  TrashIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { Badge } from '@/_components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/_components/ui/dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'

import { updateLostReason } from '@/_actions/settings/lost-reasons/update'
import { deleteLostReason } from '@/_actions/settings/lost-reasons/delete'
import { useAction } from 'next-safe-action/hooks'
import UpsertLostReasonDialog from './upsert-lost-reason-dialog'
import { Sheet } from '@/_components/ui/sheet'

interface LostReason {
  id: string
  name: string
  isActive: boolean
  _count: {
    deals: number
  }
}

interface LostReasonsListProps {
  initialReasons: LostReason[]
}

const LostReasonsList = ({ initialReasons }: LostReasonsListProps) => {
  const [reasons, setReasons] = useState(initialReasons)
  const [editingReason, setEditingReason] = useState<LostReason | null>(null)
  const [isUpsertOpen, setIsUpsertOpen] = useState(false)
  const [deletingReason, setDeletingReason] = useState<LostReason | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Apenas para o toggle de status. O resto (Update Nome) vai via Dialog.
  const { execute: executeUpdateToggle, isPending: isUpdatingToggle } =
    useAction(updateLostReason, {
      onSuccess: () => {
        toast.success('Status atualizado com sucesso!')
        // window.location.reload() // Opcional se quiser refresh full
      },
      onError: () => {
        toast.error('Erro ao atualizar status.')
        // Rollback otimista se necessário
      },
    })

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteLostReason,
    {
      onSuccess: () => {
        toast.success('Motivo removido com sucesso!')
        setIsDeleteDialogOpen(false)
        setDeletingReason(null)
        window.location.reload()
      },
      onError: () => toast.error('Erro ao remover motivo.'),
    },
  )

  const handleCreateClick = () => {
    setEditingReason(null)
    setIsUpsertOpen(true)
  }

  const handleEditClick = (reason: LostReason) => {
    setEditingReason(reason)
    setIsUpsertOpen(true)
  }

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    // Optimistic Update
    setReasons((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !currentStatus } : r)),
    )
    executeUpdateToggle({ id, isActive: !currentStatus })
  }

  const isLoading = isUpdatingToggle || isDeleting

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={handleCreateClick} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Motivo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Motivos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Deals Perdidos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reasons.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum motivo cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  reasons.map((reason) => (
                    <TableRow key={reason.id}>
                      <TableCell className="font-medium">
                        {reason.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{reason._count.deals}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={reason.isActive}
                          onCheckedChange={() =>
                            handleToggleActive(reason.id, reason.isActive)
                          }
                          disabled={isLoading}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isLoading}
                            >
                              {isLoading &&
                              editingReason?.id === reason.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditClick(reason)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar nome
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => {
                                setDeletingReason(reason)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir motivo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isUpsertOpen} onOpenChange={setIsUpsertOpen}>
        <UpsertLostReasonDialog
          isOpen={isUpsertOpen}
          setIsOpen={setIsUpsertOpen}
          defaultValues={
            editingReason
              ? { id: editingReason.id, name: editingReason.name }
              : undefined
          }
        />
      </Sheet>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingReason(null)
        }}
        title="Deseja excluir o motivo de perda?"
        description={
          <div className="space-y-2">
            {deletingReason && deletingReason._count.deals > 0 ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Esta ação não pode ser desfeita. Você está prestes a remover
                permanentemente este motivo de perda que está sendo usado em{' '}
                <b>{deletingReason._count.deals} negociações.</b> Se optar por
                excluir, lembre-se que não será possível recuperar a informação.
              </div>
            ) : (
              <p>Esta ação não pode ser desfeita.</p>
            )}
          </div>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingReason) executeDelete({ id: deletingReason.id })
        }}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />
    </div>
  )
}

export default LostReasonsList
