'use client'

import Link from 'next/link'
import { MailIcon, PhoneIcon, StarIcon, BriefcaseIcon, MessageCircle } from 'lucide-react'
import { Checkbox } from '@/_components/ui/checkbox'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { formatPhone } from '@/_utils/format-phone'
import { formatPhoneForWhatsApp } from '@/_utils/format-phone-whatsapp'
import ContactTableDropdownMenu from './table-dropdown-menu'
import type { ContactDto } from '@/_data-access/contact/get-contacts'

// Paleta de cores determinísticas para avatares
const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
]

/** Gera índice determinístico a partir do nome para selecionar cor do avatar */
function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0
  for (let index = 0; index < name.length; index++) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/** Extrai as iniciais das duas primeiras palavras do nome */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
}

interface ContactCardRowProps {
  contact: ContactDto
  isSelected: boolean
  onSelectionChange: (checked: boolean) => void
  onEdit: () => void
  onDelete: () => void
  orgSlug: string
  isPiiRestricted: boolean
}

export function ContactCardRow({
  contact,
  isSelected,
  onSelectionChange,
  onEdit,
  onDelete,
  orgSlug,
  isPiiRestricted,
}: ContactCardRowProps) {
  const avatarColor = getAvatarColor(contact.name)
  const initials = getInitials(contact.name)
  const formattedPhone = contact.phone ? formatPhone(contact.phone) : null

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border px-4 py-3 transition-all',
        'hover:bg-accent/50 hover:shadow-sm',
        isSelected
          ? 'border-primary/20 bg-primary/5'
          : 'border-border bg-card',
      )}
    >
      {/* Checkbox de seleção */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelectionChange(Boolean(checked))}
        aria-label={`Selecionar ${contact.name}`}
      />

      {/* Avatar com iniciais */}
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          avatarColor.bg,
          avatarColor.text,
        )}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Informações principais — ocupa o espaço restante */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={`/org/${orgSlug}/contacts/${contact.id}`}
            className="truncate font-medium hover:underline"
          >
            {contact.name}
          </Link>
          {contact.role && (
            <span className="truncate text-sm text-muted-foreground">
              {contact.role}
            </span>
          )}
          {contact.isDecisionMaker && (
            <StarIcon
              className="size-3.5 shrink-0 fill-amber-400 text-amber-400"
              aria-label="Tomador de decisão"
            />
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {contact.email && (
            isPiiRestricted ? (
              <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MailIcon className="size-3 shrink-0" />
                {contact.email}
              </span>
            ) : (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1 truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <MailIcon className="size-3 shrink-0" />
                {contact.email}
              </a>
            )
          )}
          {formattedPhone && (
            isPiiRestricted ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <PhoneIcon className="size-3 shrink-0" />
                {formattedPhone}
              </span>
            ) : (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <PhoneIcon className="size-3 shrink-0" />
                {formattedPhone}
              </a>
            )
          )}
          {contact.deals.length > 0 && (
            <Badge
              variant="secondary"
              className="h-4 gap-1 px-1.5 py-0 text-[10px]"
            >
              <BriefcaseIcon className="size-2.5" />
              {contact.deals.length}{' '}
              {contact.deals.length === 1 ? 'negócio' : 'negócios'}
            </Badge>
          )}
        </div>
      </div>

      {/* Empresa */}
      {contact.companyName && (
        <div className="hidden shrink-0 sm:block">
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {contact.companyName}
          </span>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="flex shrink-0 items-center gap-1">
        {contact.email && !isPiiRestricted && (
          <a
            href={`mailto:${contact.email}`}
            className="hidden items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
            aria-label={`Enviar email para ${contact.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MailIcon className="size-4" />
          </a>
        )}
        {contact.phone && !isPiiRestricted && (
          <a
            href={`tel:${contact.phone}`}
            className="hidden items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
            aria-label={`Ligar para ${contact.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <PhoneIcon className="size-4" />
          </a>
        )}

        {/* Botão WhatsApp — só exibe se há telefone e PII não está restrito */}
        {contact.phone && !isPiiRestricted && (
          <a
            href={`https://wa.me/${formatPhoneForWhatsApp(contact.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
            aria-label={`Abrir WhatsApp de ${contact.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <svg
              className="size-4 text-kronos-green"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </a>
        )}

        {/* Botão Inbox */}
        <Link
          href={`/org/${orgSlug}/inbox?contactId=${contact.id}`}
          className="hidden items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
          aria-label={`Abrir inbox de ${contact.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MessageCircle className="size-4 text-primary" />
        </Link>

        <ContactTableDropdownMenu
          contact={contact}
          onEdit={onEdit}
          onDelete={onDelete}
          isPiiRestricted={isPiiRestricted}
        />
      </div>
    </div>
  )
}
