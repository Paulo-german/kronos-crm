'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/_components/ui/card'
import { formatCurrency } from '@/_utils/format-currency'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'
import { Badge } from '@/_components/ui/badge'
import {
  CalendarClock,
  Clock,
  MessageCircle,
  SquareIcon,
  SquareCheckBigIcon,
} from 'lucide-react'
import { Label } from '@/_components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import {
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  type DealPriority,
} from '@/_lib/deal/deal-display-config'

interface KanbanCardProps {
  deal: DealDto
  onClick?: () => void
  onPriorityClick?: (dealId: string, anchorEl: HTMLElement) => void
  priorityOverride?: string
  showIdleDays?: boolean
}

// Config central de prioridade/status. Reexportada para os consumidores legados
// (kanban-board e deal-filters-sheet importam `priorityConfig` daqui).
export { PRIORITY_CONFIG as priorityConfig } from '@/_lib/deal/deal-display-config'

const IDLE_WARNING_DAYS = 12
const IDLE_DANGER_DAYS = 30

const getInitials = (name: string) => {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const KanbanCard = ({
  deal,
  onClick,
  onPriorityClick,
  priorityOverride,
  showIdleDays = true,
}: KanbanCardProps) => {
  const priority = (priorityOverride ?? deal.priority) as DealPriority

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: { type: 'deal', deal },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formattedValue = formatCurrency(deal.totalValue)

  // Derivação pura: dias desde a última atividade (ou criação do deal)
  const idleDays = Math.floor(
    (Date.now() - new Date(deal.lastActivityAt ?? deal.createdAt).getTime()) /
      86_400_000,
  )

  const idleStyle =
    idleDays >= IDLE_DANGER_DAYS
      ? 'text-kronos-red bg-kronos-red/10'
      : idleDays >= IDLE_WARNING_DAYS
        ? 'text-kronos-yellow bg-kronos-yellow/10'
        : 'text-muted-foreground bg-muted'

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-priority-select]')) {
      return
    }
    onClick?.()
  }

  const draggingClass = isDragging ? 'opacity-20 scale-[0.98]' : ''

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative cursor-grab border border-border-strong bg-kanban-card shadow-none transition-all ${draggingClass}`}
      onClick={handleCardClick}
    >
      <CardContent className="flex flex-col gap-4 p-3.5">
        {/* 1. Topo: Badge de Status + Prioridade */}
        <div className="flex justify-between">
          {/* Badge de Status */}
          {STATUS_CONFIG[deal.status] && (
            <Badge
              variant="outline"
              className={`h-6 gap-1.5 px-2 text-[10px] font-semibold transition-colors ${STATUS_CONFIG[deal.status].textClassName}`}
            >
              <SquareIcon size={10} className="fill-current" />
              {STATUS_CONFIG[deal.status].label}
            </Badge>
          )}

          {/* Prioridade (Botão leve — abre Popover singleton no Board) */}
          <div
            className="flex flex-col gap-0.5"
            data-priority-select
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={`flex h-6 w-6 items-center justify-center rounded-md border bg-transparent transition-colors hover:bg-accent ${PRIORITY_CONFIG[priority].color}`}
              onClick={(e) => onPriorityClick?.(deal.id, e.currentTarget)}
            >
              {(() => {
                const Icon = PRIORITY_CONFIG[priority].icon
                return <Icon className="h-3.5 w-3.5" />
              })()}
            </button>
          </div>
        </div>
        {/* 2. Sub-topo: Título do Deal */}
        <p className="line-clamp-2 cursor-pointer text-sm font-semibold leading-tight text-foreground hover:text-primary">
          {deal.title}
        </p>
        {/* 3. Meio: Grid de Contato + Valor */}
        <div className="flex justify-between">
          {/* Coluna Contato */}
          <div className="flex gap-4">
            <div className="flex h-6 cursor-default items-center truncate text-xs font-medium text-foreground">
              {deal.contactName ? (
                <Tooltip>
                  <div className="flex items-center gap-1">
                    <TooltipTrigger asChild>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-kronos-purple">
                        {getInitials(deal.contactName)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{deal.contactName}</p>
                    </TooltipContent>
                  </div>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold italic text-muted-foreground">
                      N/A
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sem contato associado</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Coluna Valor */}
            <div className="flex flex-col gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-6 items-center">
                    <span className="inline-flex items-center rounded-md text-xs font-bold text-foreground">
                      {formattedValue}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="space-x-5">Valor único {formattedValue}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {/* 3.5 Contadores de atividade */}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <SquareCheckBigIcon className="size-3" />
              {deal.taskCount}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3" />
              {deal.appointmentCount}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3" />
              {deal.conversationCount}
            </span>
          </p>
        </div>

        {/* 3.6 Indicador de Inatividade */}
        {showIdleDays && deal.status !== 'WON' && deal.status !== 'LOST' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center justify-center gap-1.5 rounded-md px-1.5 py-1.5 text-xs font-medium ${idleStyle}`}
              >
                <Clock className="h-3 w-3" />
                <span>
                  {idleDays === 0
                    ? 'Ativo hoje'
                    : idleDays === 1
                      ? '1 dia sem atividade'
                      : `${idleDays} dias sem atividade`}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {deal.lastActivityAt
                  ? `Última atividade: ${new Date(deal.lastActivityAt).toLocaleDateString('pt-BR')}`
                  : `Criado em: ${new Date(deal.createdAt).toLocaleDateString('pt-BR')}`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* 4. Base: Observações */}
        {deal.notes && (
          <div className="flex flex-col gap-1 border-t border-border-strong pt-2">
            <Label className="text-[10px] uppercase text-muted-foreground">
              Observações
            </Label>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {deal.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default KanbanCard
