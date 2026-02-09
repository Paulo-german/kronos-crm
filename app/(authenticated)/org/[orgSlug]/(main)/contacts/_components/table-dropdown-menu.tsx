'use client'

import { useState } from 'react'
import { AlertDialog, AlertDialogTrigger } from '@/_components/ui/alert-dialog'
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
import DeleteContactDialogContent from './delete-dialog-content'
import { ContactDto } from '@/_data-access/contact/get-contacts'
import { toast } from 'sonner'

interface ContactTableDropdownMenuProps {
  contact: ContactDto
  onDelete: () => void
  onEdit: () => void
}

const ContactTableDropdownMenu = ({
  contact,
  onDelete,
  onEdit,
}: ContactTableDropdownMenuProps) => {
  const [deleteIsOpen, setDeleteIsOpen] = useState(false)

  return (
    <div className="flex items-center justify-end">
      <AlertDialog open={deleteIsOpen} onOpenChange={setDeleteIsOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-6 p-0">
              <MoreHorizontalIcon size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(contact.email || '')
                toast.success('Email copiado para a área de transferência.')
              }}
              disabled={!contact.email}
            >
              <ClipboardCopyIcon size={16} />
              Copiar Email
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-1.5" onSelect={onEdit}>
              <EditIcon size={16} />
              Editar
            </DropdownMenuItem>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="gap-1.5 text-destructive focus:text-destructive">
                <TrashIcon size={16} />
                Deletar
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <DeleteContactDialogContent
          contactName={contact.name}
          onDelete={onDelete}
        />
      </AlertDialog>
    </div>
  )
}

export default ContactTableDropdownMenu
