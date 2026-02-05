'use client'

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
import Link from 'next/link'
import { DataTable } from '@/_components/data-table'
import { formatPhone } from '@/_utils/format-phone'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import ContactTableDropdownMenu from './table-dropdown-menu'
import { Button } from '@/_components/ui/button'
import { useAction } from 'next-safe-action/hooks'
import { bulkDeleteContacts } from '@/_actions/contact/bulk-delete-contacts'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'

interface ContactsDataTableProps {
  contacts: ContactDto[]
  companyOptions: CompanyDto[]
}

export function ContactsDataTable({
  contacts,
  companyOptions,
}: ContactsDataTableProps) {
  // Hook para deletar em massa
  const { execute: executeBulkDelete, isExecuting: isDeleting } = useAction(
    bulkDeleteContacts,
    {
      onSuccess: ({ data }) => {
        toast.success(`${data?.count || 1} contato(s) excluído(s) com sucesso.`)
      },
      onError: () => {
        toast.error('Erro ao excluir contatos.')
      },
    },
  )

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
          <Link
            href={`/contacts/${contact.id}`}
            className="ml-2 font-medium hover:underline"
          >
            {contact.name}
          </Link>
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
            companyOptions={companyOptions}
          />
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={contacts}
      enableSelection={true}
      bulkActions={({ selectedRows, resetSelection }) => (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8">
                <TrashIcon className="mr-2 h-4 w-4" />
                Deletar
              </Button>
            </AlertDialogTrigger>
            <ConfirmationDialogContent
              title="Excluir contatos selecionados?"
              description={
                <p>
                  Esta ação não pode ser desfeita. Você está prestes a remover
                  <br />
                  <span className="font-semibold text-foreground">
                    {selectedRows.length} contatos permanentemente do sistema.
                  </span>
                </p>
              }
              icon={<TrashIcon />}
              variant="destructive"
            >
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={() => {
                  const ids = selectedRows.map((r) => r.id)
                  executeBulkDelete({ ids })
                  resetSelection()
                }}
              >
                Sim, excluir
              </AlertDialogAction>
            </ConfirmationDialogContent>
          </AlertDialog>
        </>
      )}
    />
  )
}
