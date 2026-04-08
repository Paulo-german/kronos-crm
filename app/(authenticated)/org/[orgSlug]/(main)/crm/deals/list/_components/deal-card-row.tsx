'use client'

import Link from 'next/link'
import { CircleIcon, CalendarIcon, FlagIcon } from 'lucide-react'
import { Checkbox } from '@/_components/ui/checkbox'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../_lib/deal-filters'
import DealTableDropdownMenu from './deal-table-dropdown-menu'
import type { DealListDto } from '@/_data-access/deal/get-deals'
import type { DealPriority } from '@prisma/client'

// Paleta de cores determinísticas para avatares de responsável
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

function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0
  for (let index = 0; index < name.length; index++) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
}

const PRIORITY_DOT_COLOR: Record<DealPriority, string> = {
  low: 'bg-muted-foreground/40',
  medium: 'bg-kronos-blue',
  high: 'bg-kronos-yellow',
  urgent: 'bg-kronos-red',
}

interface DealCardRowProps {
  deal: DealListDto
  isSelected: boolean
  onSelectionChange: (checked: boolean) => void
  onEdit: () => void
  onDelete: () => void
  orgSlug: string
}

export function DealCardRow({
  deal,
  isSelected,
  onSelectionChange,
  onEdit,
  onDelete,
  orgSlug,
}: DealCardRowProps) {
  const statusOption = STATUS_OPTIONS.find((opt) => opt.value === deal.status)
  const priorityOption = PRIORITY_OPTIONS.find((opt) => opt.value === deal.priority)

  const assigneeInitials = deal.assigneeName ? getInitials(deal.assigneeName) : '?'
  const assigneeColor = deal.assigneeName
    ? getAvatarColor(deal.assigneeName)
    : { bg: 'bg-muted', text: 'text-muted-foreground' }

  const formattedDate = deal.expectedCloseDate
    ? new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border px-4 py-3 transition-all',
        'hover:bg-accent/50 hover:shadow-sm',
        isSelected ? 'border-primary/20 bg-primary/5' : 'border-border bg-card',
      )}
    >
      {/* Checkbox de seleção */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelectionChange(Boolean(checked))}
        aria-label={`Selecionar ${deal.title}`}
      />

      {/* Dot de prioridade */}
      <div
        className={cn(
          'size-2 shrink-0 rounded-full',
          PRIORITY_DOT_COLOR[deal.priority as DealPriority],
        )}
        aria-label={`Prioridade: ${priorityOption?.label ?? deal.priority}`}
      />

      {/* Informações principais */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={`/org/${orgSlug}/crm/deals/${deal.id}`}
            className="truncate font-medium hover:underline"
          >
            {deal.title}
          </Link>
          <span className="truncate text-sm text-muted-foreground">
            {deal.stageName}
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {/* Status badge */}
          {statusOption && (
            <Badge
              variant="outline"
              className={cn(
                'h-4.5 gap-1 px-1.5 py-0 text-[10px] font-semibold',
                statusOption.color,
              )}
            >
              <CircleIcon className="h-1.5 w-1.5 fill-current" />
              {statusOption.label}
            </Badge>
          )}

          {/* Priority badge */}
          {priorityOption && (
            <Badge
              variant="outline"
              className="h-4.5 bg-transparent px-1.5 py-0 text-[10px] font-semibold"
            >
              <FlagIcon className="mr-0.5 h-2.5 w-2.5" />
              {priorityOption.label}
            </Badge>
          )}

          {/* Contato */}
          {deal.contactName && (
            <span className="truncate text-xs text-muted-foreground">
              {deal.contactName}
            </span>
          )}

          {/* Empresa */}
          {deal.companyName && (
            <span className="hidden truncate rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">
              {deal.companyName}
            </span>
          )}
        </div>
      </div>

      {/* Valor */}
      <div className="hidden shrink-0 text-sm font-semibold tabular-nums lg:block">
        {formatCurrency(deal.totalValue)}
      </div>

      {/* Data prevista */}
      {formattedDate && (
        <div className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground xl:flex">
          <CalendarIcon className="h-3 w-3" />
          {formattedDate}
        </div>
      )}

      {/* Avatar do responsável */}
      <div
        className={cn(
          'hidden size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold md:flex',
          assigneeColor.bg,
          assigneeColor.text,
        )}
        aria-label={`Responsável: ${deal.assigneeName ?? 'Não atribuído'}`}
      >
        {assigneeInitials}
      </div>

      {/* Menu de ações */}
      <DealTableDropdownMenu onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
