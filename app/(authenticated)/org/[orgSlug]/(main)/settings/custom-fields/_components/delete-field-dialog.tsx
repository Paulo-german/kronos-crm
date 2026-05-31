'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, TriangleAlert } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
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

  const hasValues = (definition?.valueCount ?? 0) > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir campo</AlertDialogTitle>

          {hasValues ? (
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Tem certeza que deseja excluir o campo{' '}
                  <span className="font-semibold text-foreground">
                    &quot;{definition?.label}&quot;
                  </span>
                  ?
                </p>

                <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold">Este campo possui dados preenchidos</p>
                    <p className="text-destructive/80">
                      {definition?.valueCount}{' '}
                      {definition?.valueCount === 1
                        ? 'registro possui um valor'
                        : 'registros possuem valores'}{' '}
                      preenchido(s) neste campo. Ao confirmar, todos esses dados serão{' '}
                      <span className="font-semibold">permanentemente apagados</span> e não
                      poderão ser recuperados.
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription>
              Tem certeza que deseja excluir o campo{' '}
              <span className="font-semibold">&quot;{definition?.label}&quot;</span>? Esta ação
              não poderá ser desfeita.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {hasValues ? 'Sim, excluir e apagar dados' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
