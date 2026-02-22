'use client'

import { useState, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  Building2Icon,
  User2Icon,
  AxeIcon,
  TrashIcon,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { DataTable } from '@/_components/data-table'
import { formatPhone } from '@/_utils/format-phone'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import ContactTableDropdownMenu from './table-dropdown-menu'
import { Button } from '@/_components/ui/button'
import { Dialog } from '@/_components/ui/dialog'
import { useAction } from 'next-safe-action/hooks'
import { bulkDeleteContacts } from '@/_actions/contact/bulk-delete-contacts'
import { deleteContact } from '@/_actions/contact/delete-contact'
import { updateContact } from '@/_actions/contact/update-contact'
import { toast } from 'sonner'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertContactDialogContent from './upsert-dialog-content'
import ContactDetailDialogContent from './contact-detail-dialog-content'
import type { MemberRole } from '@prisma/client'

interface MemberDto {
  id: string
  userId: string | null
  email: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
}

interface ContactsDataTableProps {
  contacts: ContactDto[]
  companyOptions: CompanyDto[]
  members: MemberDto[]
  currentUserId: string
  userRole: MemberRole
}

export function ContactsDataTable({
  contacts,
  companyOptions,
  members,
  currentUserId,
  userRole,
}: ContactsDataTableProps) {
  // Estado do dialog de edição (levantado para cá para sobreviver ao re-render da tabela)
  const [editingContact, setEditingContact] = useState<ContactDto | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  // Estado do dialog de detalhes
  const [selectedContact, setSelectedContact] = useState<ContactDto | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  // Estado do dialog de deleção individual
  const [deletingContact, setDeletingContact] = useState<ContactDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  // Estado do dialog de deleção em massa
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  // Hook para deletar em massa
  const { execute: executeBulkDelete, isExecuting: isDeleting } = useAction(
    bulkDeleteContacts,
    {
      onSuccess: ({ data }) => {
        toast.success(`${data?.count || 1} contato(s) excluído(s) com sucesso.`)
        setIsBulkDeleteOpen(false)
        resetSelectionRef.current?.()
      },
      onError: () => {
        toast.error('Erro ao excluir contatos.')
      },
    },
  )

  // Hook para deletar individualmente (precisa estar aqui para não desmontar com a linha da tabela)
  const { execute: executeDelete, isExecuting: isDeletingIndividual } =
    useAction(deleteContact, {
      onSuccess: () => {
        toast.success('Contato excluído com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingContact(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir contato.')
      },
    })

  // Hook para atualizar individualmente (precisa estar aqui para não desmontar com a linha da tabela)
  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateContact,
    {
      onSuccess: () => {
        toast.success('Contato atualizado com sucesso!')
        setIsEditDialogOpen(false)
        setEditingContact(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar contato.')
      },
    },
  )

  const handleEdit = (contact: ContactDto) => {
    setEditingContact(contact)
    setIsEditDialogOpen(true)
  }

  const columns: ColumnDef<ContactDto>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span>Nome</span>
        </div>
      ),
      cell: ({ row }) => {
        const contact = row.original
        return (
          <button
            type="button"
            onClick={() => {
              setSelectedContact(contact)
              setIsDetailDialogOpen(true)
            }}
            className="ml-2 font-medium hover:underline text-left"
          >
            {contact.name}
          </button>
        )
      },
    },
    {
      accessorKey: 'email',
      header: () => (
        <div className="flex items-center gap-2">
          <MailIcon className="h-4 w-4 text-muted-foreground" />
          <span>Email</span>
        </div>
      ),
      cell: ({ row }) => {
        const email = row.getValue('email') as string | null
        if (!email) return <span className="text-muted-foreground">-</span>
        return <div className="flex items-center gap-2">{email}</div>
      },
    },
    {
      accessorKey: 'phone',
      header: () => (
        <div className="flex items-center gap-2">
          <PhoneIcon className="h-4 w-4 text-muted-foreground" />
          <span>Telefone</span>
        </div>
      ),
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null
        if (!phone) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex items-center gap-2">{formatPhone(phone)}</div>
        )
      },
    },
    {
      accessorKey: 'companyName',
      header: () => (
        <div className="flex items-center gap-2">
          <Building2Icon className="h-4 w-4 text-muted-foreground" />
          <span>Empresa</span>
        </div>
      ),
      cell: ({ row }) => {
        const companyName = row.getValue('companyName') as string | null
        if (!companyName) {
          return '-'
        }
        return <div className="flex items-center gap-2">{companyName}</div>
      },
    },
    {
      accessorKey: 'role',
      header: () => (
        <div className="flex items-center gap-2">
          <User2Icon className="h-4 w-4 text-muted-foreground" />
          <span>Cargo</span>
        </div>
      ),
      cell: ({ row }) => {
        const role = row.getValue('role') as string | null
        return role || <span className="text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'isDecisionMaker',
      header: () => (
        <div className="flex items-center gap-2">
          <AxeIcon className="h-4 w-4 text-muted-foreground" />
          <span>Decisor</span>
        </div>
      ),
      cell: ({ row }) => {
        const isDecisionMaker = row.getValue('isDecisionMaker') as boolean
        return isDecisionMaker ? (
          <Badge variant="default">Sim</Badge>
        ) : (
          <Badge variant="secondary">Não</Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <ContactTableDropdownMenu
            contact={contact}
            onDelete={() => {
              setDeletingContact(contact)
              setIsDeleteDialogOpen(true)
            }}
            onEdit={() => handleEdit(contact)}
          />
        )
      },
    },
  ]

  return (
    <>
      {/* Dialog de edição fora da tabela para sobreviver ao re-render */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setEditingContact(null)
        }}
      >
        {editingContact && (
          <UpsertContactDialogContent
            key={editingContact.id}
            defaultValues={{
              id: editingContact.id,
              name: editingContact.name,
              email: editingContact.email || '',
              phone: editingContact.phone || '',
              role: editingContact.role || '',
              cpf: editingContact.cpf || '',
              companyId: editingContact.companyId || undefined,
              isDecisionMaker: editingContact.isDecisionMaker,
            }}
            setIsOpen={setIsEditDialogOpen}
            companyOptions={companyOptions}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Dialog>

      {/* Dialog de detalhes do contato */}
      <Dialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open)
          if (!open) setSelectedContact(null)
        }}
      >
        {selectedContact && (
          <ContactDetailDialogContent
            key={selectedContact.id}
            contact={selectedContact}
            companies={companyOptions}
            members={members}
            currentUserId={currentUserId}
            userRole={userRole}
          />
        )}
      </Dialog>

      {/* Dialog de deleção individual fora da tabela */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingContact(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente o contato{' '}
            <span className="font-bold text-foreground">
              {deletingContact?.name}
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingContact) executeDelete({ id: deletingContact.id })
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Dialog de deleção em massa fora da tabela */}
      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Excluir contatos selecionados?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            <br />
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} contatos permanentemente do sistema.
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => executeBulkDelete({ ids: bulkDeleteIds })}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      <DataTable
        columns={columns}
        data={contacts}
        enableSelection={true}
        bulkActions={({ selectedRows, resetSelection }) => {
          resetSelectionRef.current = resetSelection
          return (
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => {
                setBulkDeleteIds(selectedRows.map((row) => row.id))
                setIsBulkDeleteOpen(true)
              }}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Deletar
            </Button>
          )
        }}
      />
    </>
  )
}
