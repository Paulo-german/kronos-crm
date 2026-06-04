'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Trash2, TriangleAlert } from 'lucide-react'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { deleteFieldDefinition } from '@/_actions/field-definition/delete-field-definition'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'

interface DeleteFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition: FieldDefinitionDto | null
}

export const DeleteFieldDialog = ({
  open,
  onOpenChange,
  definition,
}: DeleteFieldDialogProps) => {
  const { execute, isPending } = useAction(deleteFieldDefinition, {
    onSuccess: () => {
      toast.success('Campo excluído com sucesso.')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir campo.')
    },
  })

  const handleConfirm = () => {
    if (!definition) return
    execute({ id: definition.id })
  }

  const valueCount = definition?.valueCount ?? 0
  const hasValues = valueCount > 0

  const description = (
    <div className="space-y-3 text-center">
      <p className="text-sm text-muted-foreground">
        Tem certeza que deseja excluir o campo{' '}
        <span className="font-semibold text-foreground">
          &quot;{definition?.label}&quot;
        </span>
        ? Esta ação não poderá ser desfeita.
      </p>

      {hasValues ? (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-left text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">
              {valueCount} {valueCount === 1 ? 'contato possui' : 'contatos possuem'} dados neste campo
            </p>
            <p className="text-destructive/80">
              Ao confirmar, todos esses dados serão{' '}
              <span className="font-semibold">permanentemente apagados</span> e não
              poderão ser recuperados.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum contato possui dados preenchidos neste campo.
        </p>
      )}
    </div>
  )

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="destructive"
      title="Excluir campo"
      description={description}
      icon={<Trash2 className="h-5 w-5" />}
      onConfirm={handleConfirm}
      isLoading={isPending}
      confirmLabel={hasValues ? 'Sim, excluir e apagar dados' : 'Excluir'}
    />
  )
}
