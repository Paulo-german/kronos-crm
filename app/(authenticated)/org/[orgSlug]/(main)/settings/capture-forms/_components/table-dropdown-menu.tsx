'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { Button } from '@/_components/ui/button'
import { CodeIcon, EditIcon, MoreHorizontalIcon, TrashIcon } from 'lucide-react'

interface CaptureFormDropdownMenuProps {
  onEdit: () => void
  onEmbed: () => void
  onDelete: () => void
}

const CaptureFormDropdownMenu = ({ onEdit, onEmbed, onDelete }: CaptureFormDropdownMenuProps) => {
  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-6 p-0">
            <MoreHorizontalIcon size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-1.5" onSelect={onEdit}>
            <EditIcon size={16} />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-1.5" onSelect={onEmbed}>
            <CodeIcon size={16} />
            Código de embed
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-1.5 text-destructive focus:text-destructive"
            onSelect={onDelete}
          >
            <TrashIcon size={16} />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default CaptureFormDropdownMenu
