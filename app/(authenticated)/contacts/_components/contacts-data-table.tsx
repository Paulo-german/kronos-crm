'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Mail, Phone, Building2 } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import Link from 'next/link'
import { DataTable } from '@/_components/data-table'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import ContactTableDropdownMenu from './table-dropdown-menu'

interface ContactsDataTableProps {
  contacts: ContactDto[]
  companyOptions: CompanyDto[]
}

export function ContactsDataTable({
  contacts,
  companyOptions,
}: ContactsDataTableProps) {
  const columns: ColumnDef<ContactDto>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => {
        const contact = row.original
        return (
          <Link
            href={`/contacts/${contact.id}`}
            className="font-medium hover:underline"
          >
            {contact.name}
          </Link>
        )
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.getValue('email') as string | null
        if (!email) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {email}
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: 'Telefone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null
        if (!phone) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {phone}
          </div>
        )
      },
    },
    {
      accessorKey: 'companyName',
      header: 'Empresa',
      cell: ({ row }) => {
        const companyName = row.getValue('companyName') as string | null
        if (!companyName) {
          return '-'
        }
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {companyName}
          </div>
        )
      },
    },
    {
      accessorKey: 'role',
      header: 'Cargo',
      cell: ({ row }) => {
        const role = row.getValue('role') as string | null
        return role || <span className="text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'isDecisionMaker',
      header: 'Decisor',
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

  return <DataTable columns={columns} data={contacts} />
}
