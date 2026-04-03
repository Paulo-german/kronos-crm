'use client'

import { useState } from 'react'
import { TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { Sheet } from '@/_components/ui/sheet'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertContactDialogContent from './upsert-dialog-content'
import { ContactsToolbar } from './contacts-toolbar'
import { ContactsDataTable } from './contacts-data-table'
import { ContactsPagination } from './contacts-pagination'
import { EmptyContacts } from './empty-contacts'
import { useContactFilters } from '../_lib/use-contact-filters'
import { updateContact } from '@/_actions/contact/update-contact'
import { deleteContact } from '@/_actions/contact/delete-contact'
import { bulkDeleteContacts } from '@/_actions/contact/bulk-delete-contacts'
import { PageTourTrigger } from '@/_components/onboarding/page-tour-trigger'
import { CONTACTS_TOUR_STEPS } from '@/_lib/onboarding/tours/contacts-tour'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { CompanyDto } from '@/_data-access/company/get-companies'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { MemberRole } from '@prisma/client'

interface ContactsListClientProps {
  contacts: ContactDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  companyOptions: CompanyDto[]
  members: AcceptedMemberDto[]
  currentUserId: string
  userRole: MemberRole
  withinQuota: boolean
  orgSlug: string
  hidePiiFromMembers: boolean
}

export function ContactsListClient({
  contacts,
  total,
  page,
  pageSize,
  totalPages,
  companyOptions,
  members,
  currentUserId,
  userRole,
  withinQuota,
  orgSlug,
  hidePiiFromMembers,
}: ContactsListClientProps) {
  const { filters, setFilters, clearFilters, activeFilterCount, hasActiveFilters } =
    useContactFilters()

  const searchParams = useSearchParams()

  // Estado elevado do Sheet de edição
  const [editingContact, setEditingContact] = useState<ContactDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado elevado do Dialog de deleção individual
  const [deletingContact, setDeletingContact] = useState<ContactDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Estado elevado do Dialog de deleção em massa
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])

  // 3 hooks de action no orquestrador
  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateContact,
    {
      onSuccess: () => {
        toast.success('Contato atualizado com sucesso!')
        setIsEditSheetOpen(false)
        setEditingContact(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar contato.')
      },
    },
  )

  const { execute: executeDelete, isPending: isDeletingIndividual } = useAction(
    deleteContact,
    {
      onSuccess: () => {
        toast.success('Contato excluído com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingContact(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir contato.')
      },
    },
  )

  const { execute: executeBulkDelete, isPending: isBulkDeleting } = useAction(
    bulkDeleteContacts,
    {
      onSuccess: ({ data }) => {
        toast.success(`${data?.count || bulkDeleteIds.length} contato(s) excluído(s) com sucesso.`)
        setIsBulkDeleteDialogOpen(false)
        setBulkDeleteIds([])
      },
      onError: () => {
        toast.error('Erro ao excluir contatos.')
      },
    },
  )

  const handleEdit = (contact: ContactDto) => {
    setEditingContact(contact)
    setIsEditSheetOpen(true)
  }

  const handleDelete = (contact: ContactDto) => {
    setDeletingContact(contact)
    setIsDeleteDialogOpen(true)
  }

  const handleBulkDelete = (ids: string[]) => {
    setBulkDeleteIds(ids)
    setIsBulkDeleteDialogOpen(true)
  }

  // Verifica se há qualquer filtro URL ativo para distinguir "lista vazia" de "sem resultados"
  const hasAnyUrlFilter =
    hasActiveFilters ||
    !!searchParams.get('search') ||
    !!searchParams.get('assignedTo')

  // Empty state premium: total zero E sem nenhum filtro ativo
  const showEmptyState = total === 0 && !hasAnyUrlFilter

  if (showEmptyState) {
    return (
      <EmptyContacts
        companyOptions={companyOptions}
        withinQuota={withinQuota}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <ContactsToolbar
          members={members}
          companyOptions={companyOptions}
          currentUserId={currentUserId}
          userRole={userRole}
          withinQuota={withinQuota}
          orgSlug={orgSlug}
          filters={filters}
          onApplyFilters={setFilters}
          onClearFilters={clearFilters}
          activeFilterCount={activeFilterCount}
        />

        <ContactsDataTable
          filteredContacts={contacts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          orgSlug={orgSlug}
          isPiiRestricted={userRole === 'MEMBER' && (hidePiiFromMembers ?? false)}
        />

        <ContactsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
        />
      </div>

      {/* Sheet de edição — estado elevado para sobreviver a re-renders */}
      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open)
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
            setIsOpen={setIsEditSheetOpen}
            companyOptions={companyOptions}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
            userRole={userRole}
            hidePiiFromMembers={hidePiiFromMembers}
          />
        )}
      </Sheet>

      {/* Dialog de deleção individual */}
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
            .
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

      {/* Dialog de deleção em massa */}
      <ConfirmationDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title="Excluir contatos selecionados?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length}{' '}
              {bulkDeleteIds.length === 1 ? 'contato' : 'contatos'}{' '}
              permanentemente do sistema.
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => executeBulkDelete({ ids: bulkDeleteIds })}
        isLoading={isBulkDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      <PageTourTrigger tourId="contacts" steps={CONTACTS_TOUR_STEPS} />
    </>
  )
}
