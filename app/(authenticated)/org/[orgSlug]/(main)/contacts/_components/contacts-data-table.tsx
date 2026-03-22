'use client'

import { useState, useCallback } from 'react'
import { TrashIcon } from 'lucide-react'
import { Checkbox } from '@/_components/ui/checkbox'
import { Button } from '@/_components/ui/button'
import { ContactCardRow } from './contact-card-row'
import type { ContactDto } from '@/_data-access/contact/get-contacts'

interface ContactsDataTableProps {
  filteredContacts: ContactDto[]
  onEdit: (contact: ContactDto) => void
  onDelete: (contact: ContactDto) => void
  onBulkDelete: (ids: string[]) => void
  orgSlug: string
}

export function ContactsDataTable({
  filteredContacts,
  onEdit,
  onDelete,
  onBulkDelete,
  orgSlug,
}: ContactsDataTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isAllSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((contact) => selectedIds.has(contact.id))

  const isIndeterminate =
    !isAllSelected && filteredContacts.some((contact) => selectedIds.has(contact.id))

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(filteredContacts.map((contact) => contact.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [filteredContacts],
  )

  const handleSelectionChange = useCallback((id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleBulkDelete = () => {
    onBulkDelete(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  if (filteredContacts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          Nenhum contato encontrado com os filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Cabeçalho com select all e bulk actions */}
      <div className="flex items-center gap-3 rounded-lg px-4 py-2">
        <Checkbox
          checked={isIndeterminate ? 'indeterminate' : isAllSelected}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
          aria-label="Selecionar todos os contatos"
        />
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'contato selecionado' : 'contatos selecionados'}
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleBulkDelete}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Excluir selecionados
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {filteredContacts.length}{' '}
            {filteredContacts.length === 1 ? 'contato' : 'contatos'}
          </span>
        )}
      </div>

      {/* Lista de cards */}
      <div data-tour="contacts-table" className="flex flex-col gap-1.5">
        {filteredContacts.map((contact) => (
          <ContactCardRow
            key={contact.id}
            contact={contact}
            isSelected={selectedIds.has(contact.id)}
            onSelectionChange={(checked) =>
              handleSelectionChange(contact.id, checked)
            }
            onEdit={() => onEdit(contact)}
            onDelete={() => onDelete(contact)}
            orgSlug={orgSlug}
          />
        ))}
      </div>
    </div>
  )
}
