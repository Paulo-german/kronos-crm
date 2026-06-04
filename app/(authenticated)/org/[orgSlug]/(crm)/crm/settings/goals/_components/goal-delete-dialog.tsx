'use client'

import { Loader2 } from 'lucide-react'
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
import { deleteGoal } from '@/_actions/goal/delete-goal'
import type { GoalDto } from '@/_data-access/goal/shared/goal-types'
import type { HookActionStatus } from 'next-safe-action/hooks'

interface GoalDeleteDialogProps {
  goal: GoalDto | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  deleteAction: {
    execute: (input: { id: string }) => void
    isPending: boolean
    status: HookActionStatus
  }
}

export function GoalDeleteDialog({
  goal,
  isOpen,
  onOpenChange,
  deleteAction,
}: GoalDeleteDialogProps) {
  if (!goal) return null

  const handleConfirm = () => {
    deleteAction.execute({ id: goal.id })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir meta</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. A meta e todo o histórico de
            progresso associado serão permanentemente removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAction.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteAction.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteAction.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Exporta o tipo do action para reutilização
export type DeleteGoalAction = ReturnType<typeof deleteGoal>
