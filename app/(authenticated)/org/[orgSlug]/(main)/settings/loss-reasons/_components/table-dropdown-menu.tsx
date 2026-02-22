'use client'

import { toast } from 'sonner'
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
  ClipboardCopyIcon,
  EditIcon,
  TrashIcon,
} from 'lucide-react'

interface LostReason {
  id: string
  name: string
  isActive: boolean
  _count: {
    deals: number
  }
}

interface LostReasonTableDropdownMenuProps {
  reason: LostReason
  onDelete: () => void
  onEdit: () => void
}

const LostReasonTableDropdownMenu = ({
  reason,
  onDelete,
  onEdit,
}: LostReasonTableDropdownMenuProps) => {
  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontalIcon size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(reason.id)
              toast.success('ID copiado para a área de transferência.')
            }}
          >
            <ClipboardCopyIcon size={16} />
            Copiar ID
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-1.5" onSelect={onEdit}>
            <EditIcon size={16} />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-1.5 text-destructive hover:text-destructive"
            onSelect={onDelete}
          >
            <TrashIcon size={16} />
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default LostReasonTableDropdownMenu
