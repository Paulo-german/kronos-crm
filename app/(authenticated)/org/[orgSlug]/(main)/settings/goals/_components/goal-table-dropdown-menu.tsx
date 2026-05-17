'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { GoalDeleteDialog } from './goal-delete-dialog'
import type { GoalWithProgressDto } from '@/_data-access/goal/shared/goal-types'
import type { HookActionStatus } from 'next-safe-action/hooks'

interface GoalTableDropdownMenuProps {
  goal: GoalWithProgressDto
  onEdit: (goal: GoalWithProgressDto) => void
  deleteAction: {
    execute: (input: { id: string }) => void
    isPending: boolean
    status: HookActionStatus
  }
}

export function GoalTableDropdownMenu({
  goal,
  onEdit,
  deleteAction,
}: GoalTableDropdownMenuProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(goal)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GoalDeleteDialog
        goal={goal}
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        deleteAction={deleteAction}
      />
    </>
  )
}
