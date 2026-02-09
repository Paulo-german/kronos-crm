'use client'

import { useState } from 'react'
import { AlertDialog, AlertDialogTrigger } from '@/_components/ui/alert-dialog'
import { Button } from '@/_components/ui/button'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'
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
import UpsertContactDialogContent from './upsert-dialog-content'
import { ContactDto } from '@/_data-access/contact/get-contacts'
import { toast } from 'sonner'
import { CompanyDto } from '@/_data-access/company/get-companies'
import type { UpdateContactInput } from '@/_actions/contact/update-contact/schema'

interface ContactTableDropdownMenuProps {
  contact: ContactDto
  companyOptions: CompanyDto[]
  onDelete: () => void
  onUpdate: (data: UpdateContactInput) => void
}

const ContactTableDropdownMenu = ({
  contact,
  companyOptions,
  onDelete,
  onUpdate,
}: ContactTableDropdownMenuProps) => {
  const [editDialogOpen, setEditDialogIsOpen] = useState(false)

  return (
    <AlertDialog>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogIsOpen}>
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
            <DialogTrigger asChild>
              <DropdownMenuItem className="gap-1.5">
                <EditIcon size={16} />
                Editar
              </DropdownMenuItem>
            </DialogTrigger>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="gap-1.5 text-destructive focus:text-destructive">
                <TrashIcon size={16} />
                Deletar
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <UpsertContactDialogContent
          defaultValues={{
            id: contact.id,
            name: contact.name,
            email: contact.email || '',
            phone: contact.phone || '',
            role: contact.role || '',
            cpf: contact.cpf || '',
            companyId: contact.companyId || undefined,
            isDecisionMaker: contact.isDecisionMaker,
          }}
          setIsOpen={setEditDialogIsOpen}
          companyOptions={companyOptions}
          onUpdate={onUpdate}
        />

        <DeleteContactDialogContent
          contactName={contact.name}
          onDelete={onDelete}
        />
      </Dialog>
    </AlertDialog>
  )
}

export default ContactTableDropdownMenu
