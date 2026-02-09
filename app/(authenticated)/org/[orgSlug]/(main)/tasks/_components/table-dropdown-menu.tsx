'use client'

import { Edit, MoreHorizontal, Trash } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { TaskDto } from '@/_data-access/task/get-tasks'
import { AlertDialog } from '@/_components/ui/alert-dialog'
import { DeleteTaskDialogContent } from './delete-dialog-content'

interface TaskTableDropdownMenuProps {
  task: TaskDto
  onDelete: () => void
  onEdit: () => void
}

export default function TaskTableDropdownMenu({
  task,
  onDelete,
  onEdit,
}: TaskTableDropdownMenuProps) {
  const [deleteIsOpen, setDeleteIsOpen] = useState(false)

  return (
    <div className="flex items-center justify-end">
      <AlertDialog open={deleteIsOpen} onOpenChange={setDeleteIsOpen}>
        <DeleteTaskDialogContent taskTitle={task.title} onDelete={onDelete} />
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(task.id)}
          >
            Copiar ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteIsOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash className="mr-2 h-4 w-4" />
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
