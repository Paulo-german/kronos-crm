'use client'

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
import { ContactDto } from '@/_data-access/contact/get-contacts'
import { toast } from 'sonner'

interface ContactTableDropdownMenuProps {
  contact: ContactDto
  onDelete: () => void
  onEdit: () => void
  isPiiRestricted: boolean
}

const ContactTableDropdownMenu = ({
  contact,
  onDelete,
  onEdit,
  isPiiRestricted,
}: ContactTableDropdownMenuProps) => {
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
          {contact.email && !isPiiRestricted && (
            <DropdownMenuItem
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(contact.email as string)
                toast.success('Email copiado para a área de transferência.')
              }}
            >
              <ClipboardCopyIcon size={16} />
              Copiar Email
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-1.5" onSelect={onEdit}>
            <EditIcon size={16} />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-1.5 text-destructive focus:text-destructive"
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

export default ContactTableDropdownMenu
