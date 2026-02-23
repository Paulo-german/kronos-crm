'use client'

import { Edit, MoreHorizontal, TrashIcon } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import type { AppointmentStatus } from '@prisma/client'

const LOCKED_STATUSES: AppointmentStatus[] = [
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
]

interface AppointmentTableDropdownMenuProps {
  status: AppointmentStatus
  onEdit: () => void
  onDelete: () => void
}

export default function AppointmentTableDropdownMenu({
  status,
  onEdit,
  onDelete,
}: AppointmentTableDropdownMenuProps) {
  const isLocked = LOCKED_STATUSES.includes(status)
  const canDelete = status === 'CANCELED'

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-1.5"
            onSelect={onEdit}
            disabled={isLocked}
          >
            <Edit className="h-4 w-4" />
            Editar
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem
              className="gap-1.5 text-destructive focus:text-destructive"
              onSelect={onDelete}
            >
              <TrashIcon className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
