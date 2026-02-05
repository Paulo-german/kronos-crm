'use client'

import { Edit, MoreHorizontal, Trash } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/_components/ui/button'
import { Dialog } from '@/_components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { TaskDto } from '@/_data-access/task/get-tasks'
import { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import { UpsertTaskDialogContent } from './upsert-dialog-content'
import { AlertDialog } from '@/_components/ui/alert-dialog'
import { DeleteTaskDialogContent } from './delete-dialog-content'

interface TaskTableDropdownMenuProps {
  task: TaskDto
  dealOptions: DealOptionDto[]
}

export default function TaskTableDropdownMenu({
  task,
  dealOptions,
}: TaskTableDropdownMenuProps) {
  const [upsertIsOpen, setUpsertIsOpen] = useState(false)
  const [deleteIsOpen, setDeleteIsOpen] = useState(false)

  return (
    // Importante: Dialog e AlertDialog fora do Dropdown para evitar conflitos de foco/z-index
    <div className="flex items-center justify-end">
      <Dialog open={upsertIsOpen} onOpenChange={setUpsertIsOpen}>
        <UpsertTaskDialogContent
          defaultValues={task}
          setIsOpen={setUpsertIsOpen}
          dealOptions={dealOptions}
        />
      </Dialog>

      <AlertDialog open={deleteIsOpen} onOpenChange={setDeleteIsOpen}>
        <DeleteTaskDialogContent
          taskId={task.id}
          taskTitle={task.title}
          onSuccess={() => setDeleteIsOpen(false)}
        />
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

          <DropdownMenuItem onSelect={() => setUpsertIsOpen(true)}>
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
