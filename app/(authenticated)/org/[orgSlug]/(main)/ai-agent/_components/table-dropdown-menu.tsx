'use client'

import Link from 'next/link'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  MoreHorizontalIcon,
  EditIcon,
  EyeIcon,
  TrashIcon,
} from 'lucide-react'

interface AgentTableDropdownMenuProps {
  agentDetailHref: string
  onEdit: () => void
  onDelete: () => void
}

const AgentTableDropdownMenu = ({
  agentDetailHref,
  onEdit,
  onDelete,
}: AgentTableDropdownMenuProps) => {
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
          <DropdownMenuItem className="gap-1.5" asChild>
            <Link href={agentDetailHref}>
              <EyeIcon size={16} />
              Ver detalhes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-1.5" onSelect={onEdit}>
            <EditIcon size={16} />
            Editar
          </DropdownMenuItem>
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

export default AgentTableDropdownMenu
