'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MailIcon, PhoneIcon, BriefcaseIcon, CalendarIcon } from 'lucide-react'
import { Checkbox } from '@/_components/ui/checkbox'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { formatPhone } from '@/_utils/format-phone'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import {
  SCORE_RED_MAX,
  SCORE_YELLOW_MAX,
} from '@/../trigger/lib/health-score-constants'
import { LEGAL_BASIS_CONFIG } from '@/_lib/privacy/consent-labels'
import { ShieldCheck } from 'lucide-react'
import ContactTableDropdownMenu from './table-dropdown-menu'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import {
  useContactCapabilities,
  useContactBasePath,
} from '../_lib/contact-capabilities-context'

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
  isScoreEnabled: boolean
}

export function ContactCardRow({
  contact,
  isSelected,
  onSelectionChange,
  onEdit,
  onDelete,
  orgSlug,
  isPiiRestricted,
  isScoreEnabled,
}: ContactCardRowProps) {
  const router = useRouter()
  const { deals: showDeals } = useContactCapabilities()
  const basePath = useContactBasePath()
  const avatarColor = getAvatarColor(contact.name)
  const initials = getInitials(contact.name)
  const formattedPhone = contact.phone ? formatPhone(contact.phone) : null
  const stageCfg = LIFECYCLE_STAGE_CONFIG[contact.lifecycleStage]
  const detailHref = `/org/${orgSlug}/${basePath}/contacts/${contact.id}`

  return (
    <div
      onClick={() => router.push(detailHref)}
      className={cn(
        'flex cursor-pointer items-center gap-4 rounded-lg border px-4 py-3 transition-all',
        'hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-sm',
        isSelected
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-card',
      )}
    >
      {/* Checkbox de seleção */}
      <div onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(Boolean(checked))}
          aria-label={`Selecionar ${contact.name}`}
        />
      </div>

      {/* Avatar com iniciais */}
      <div
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          avatarColor.bg,
          avatarColor.text,
        )}
        aria-hidden="true"
      >
        {initials}
        {isScoreEnabled && contact.healthScore !== null && (
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card',
              contact.healthScore <= SCORE_RED_MAX && 'bg-red-500',
              contact.healthScore > SCORE_RED_MAX &&
                contact.healthScore <= SCORE_YELLOW_MAX &&
                'bg-amber-500',
              contact.healthScore > SCORE_YELLOW_MAX && 'bg-emerald-500',
            )}
            title={`Health Score: ${Math.round(contact.healthScore)}`}
            aria-label={`Health Score: ${Math.round(contact.healthScore)}`}
          />
        )}
      </div>

      {/* Informações principais — ocupa o espaço restante */}
      <div className="min-w-0 flex-1">
        {/* Linha 1: nome + cargo + divisória + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{contact.name}</span>
          {contact.role && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {contact.role}
            </span>
          )}
          <div className="h-3.5 w-px shrink-0 bg-border-strong" />
          <Badge
            variant="outline"
            className={cn(
              'h-5 gap-1 px-1.5 text-[10px] font-medium',
              stageCfg.badgeClassName,
            )}
          >
            <stageCfg.icon className="size-2.5" />
            {stageCfg.label}
          </Badge>
          {contact.legalBasis && (
            <Badge
              variant="outline"
              className={cn(
                'h-5 gap-1 px-1.5 text-[10px] font-medium',
                LEGAL_BASIS_CONFIG[contact.legalBasis].badgeClassName,
              )}
            >
              <ShieldCheck className="size-2.5" />
              {LEGAL_BASIS_CONFIG[contact.legalBasis].label}
            </Badge>
          )}
          {showDeals && contact.deals.length > 0 && (
            <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
              <BriefcaseIcon className="size-2.5" />
              {contact.deals.length}{' '}
              {contact.deals.length === 1 ? 'negócio' : 'negócios'}
            </Badge>
          )}
        </div>

        {/* Linha 3: contato */}
        <div className="mt-1 flex items-center gap-3">
          {contact.email && (
            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MailIcon className="size-3 shrink-0" />
              {contact.email}
            </span>
          )}
          {formattedPhone && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <PhoneIcon className="size-3 shrink-0" />
              {formattedPhone}
            </span>
          )}
        </div>
      </div>

      {/* Data de criação */}
      <div className="hidden shrink-0 items-center justify-center gap-1.5 sm:flex">
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {format(new Date(contact.createdAt), "d 'de' MMM, yyyy", {
            locale: ptBR,
          })}
        </span>
      </div>

      {/* Empresa */}
      {contact.companyName && (
        <div className="hidden shrink-0 sm:block">
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {contact.companyName}
          </span>
        </div>
      )}

      {/* Ações */}
      <div onClick={(event) => event.stopPropagation()}>
        <ContactTableDropdownMenu
          contact={contact}
          onEdit={onEdit}
          onDelete={onDelete}
          isPiiRestricted={isPiiRestricted}
          orgSlug={orgSlug}
        />
      </div>
    </div>
  )
}
