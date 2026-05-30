'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import { TrashIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DataTable } from '@/_components/data-table'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { updateCaptureForm } from '@/_actions/capture-form/update-capture-form'
import { deleteCaptureForm } from '@/_actions/capture-form/delete-capture-form'
import { toggleCaptureFormStatus } from '@/_actions/capture-form/toggle-capture-form-status'
import type { CaptureFormDto } from '@/_data-access/capture-form/get-capture-forms'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { z } from 'zod'
import type { updateCaptureFormSchema } from '@/_actions/capture-form/schema'
import CaptureFormDropdownMenu from './table-dropdown-menu'
import { UpsertCaptureFormDialog } from './upsert-capture-form-dialog'
import { EmbedSnippetDialog } from './embed-snippet-dialog'

type UpdateInput = z.infer<typeof updateCaptureFormSchema>

interface CaptureFormsDataTableProps {
  forms: CaptureFormDto[]
  members: AcceptedMemberDto[]
}

export const CaptureFormsDataTable = ({ forms, members }: CaptureFormsDataTableProps) => {
  const [editingForm, setEditingForm] = useState<CaptureFormDto | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [embedForm, setEmbedForm] = useState<CaptureFormDto | null>(null)
  const [isEmbedOpen, setIsEmbedOpen] = useState(false)
  const [deletingForm, setDeletingForm] = useState<CaptureFormDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { execute: executeUpdate, isExecuting: isUpdating } = useAction(updateCaptureForm, {
    onSuccess: () => {
      toast.success('Formulário atualizado.')
      setIsEditOpen(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar formulário.')
    },
  })

  const { execute: executeDelete, isExecuting: isDeleting } = useAction(deleteCaptureForm, {
    onSuccess: () => {
      toast.success('Formulário excluído.')
      setIsDeleteOpen(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir formulário.')
    },
  })

  const { execute: executeToggle } = useAction(toggleCaptureFormStatus, {
    onSuccess: ({ input }) => {
      toast.success(input.isActive ? 'Formulário ativado.' : 'Formulário desativado.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao alterar status.')
    },
  })

  const columns: ColumnDef<CaptureFormDto>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'submissionCount',
      header: 'Respostas',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.submissionCount}</span>
      ),
    },
    {
      accessorKey: 'assigneeName',
      header: 'Responsável padrão',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.assigneeName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.isActive}
            onCheckedChange={(checked) =>
              executeToggle({ id: row.original.id, isActive: checked })
            }
          />
          <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
            {row.original.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Criado',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(row.original.createdAt, { locale: ptBR, addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <CaptureFormDropdownMenu
          onEdit={() => {
            setEditingForm(row.original)
            setIsEditOpen(true)
          }}
          onEmbed={() => {
            setEmbedForm(row.original)
            setIsEmbedOpen(true)
          }}
          onDelete={() => {
            setDeletingForm(row.original)
            setIsDeleteOpen(true)
          }}
        />
      ),
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={forms} />

      <UpsertCaptureFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        defaultValues={editingForm ?? undefined}
        members={members}
        onUpdate={executeUpdate}
        isUpdating={isUpdating}
      />

      {embedForm && (
        <EmbedSnippetDialog
          open={isEmbedOpen}
          onOpenChange={setIsEmbedOpen}
          formName={embedForm.name}
          publicToken={embedForm.publicToken}
        />
      )}

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir formulário"
        description={
          <>
            Tem certeza que deseja excluir <strong>{deletingForm?.name}</strong>?
            Os dados de captura já realizados serão preservados.
          </>
        }
        icon={<TrashIcon size={20} />}
        variant="destructive"
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onConfirm={() => deletingForm && executeDelete({ id: deletingForm.id })}
      />
    </>
  )
}
