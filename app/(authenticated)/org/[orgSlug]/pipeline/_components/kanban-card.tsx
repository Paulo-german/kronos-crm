'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Card, CardContent } from '@/_components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { updateDealPriority } from '@/_actions/deal/update-deal-priority'
import { formatCurrency } from '@/_utils/format-currency'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'
import { Badge } from '@/_components/ui/badge'
import { CircleIcon } from 'lucide-react'
import { Label } from '@/_components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

interface KanbanCardProps {
  deal: DealDto
  onClick?: () => void
}

const priorityConfig = {
  low: {
    label: 'BAIXA',
    color: 'border-muted-foreground/30 text-muted-foreground',
  },
  medium: { label: 'MÉDIA', color: 'border-kronos-blue/40 text-kronos-blue' },
  high: { label: 'ALTA', color: 'border-kronos-yellow/40 text-kronos-yellow' },
  urgent: { label: 'URGENTE', color: 'border-kronos-red/40 text-kronos-red' },
}

const statusConfig = {
  OPEN: {
    label: 'NOVO',
    color:
      'bg-kronos-blue/10 text-kronos-blue border border-kronos-blue/20 hover:bg-kronos-blue/20',
    variant: 'secondary' as const,
  },
  IN_PROGRESS: {
    label: 'EM ANDAMENTO',
    color:
      'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20 hover:bg-kronos-purple/20',
    variant: 'secondary' as const,
  },
  WON: {
    label: 'VENDIDO',
    color:
      'bg-kronos-green/10 text-kronos-green border-kronos-green/20 hover:bg-kronos-green/20',
    variant: 'secondary' as const,
  },
  LOST: {
    label: 'PERDIDO',
    color:
      'bg-kronos-red/10 text-kronos-red border-kronos-red/20 hover:bg-kronos-red/20',
    variant: 'secondary' as const,
  },
  PAUSED: {
    label: 'PAUSADO',
    color:
      'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20 hover:bg-kronos-yellow/20',
    variant: 'secondary' as const,
  },
}

const KanbanCard = ({ deal, onClick }: KanbanCardProps) => {
  const [priority, setPriority] = useState(deal.priority)

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

  const { execute: executeUpdatePriority } = useAction(updateDealPriority, {
    onError: ({ error }) => {
      // Rollback
      setPriority(deal.priority)
      toast.error(error.serverError || 'Erro ao atualizar prioridade.')
    },
  })

  // Formata valor para BRL
  const formattedValue = formatCurrency(deal.totalValue)

  const handlePriorityChange = (newPriority: string) => {
    const validPriority = newPriority as 'low' | 'medium' | 'high' | 'urgent'
    // Optimistic update
    setPriority(validPriority)
    // Sync with server
    executeUpdatePriority({ dealId: deal.id, priority: validPriority })
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Não abre o modal se clicou no select
    if ((e.target as HTMLElement).closest('[data-priority-select]')) {
      return
    }
    onClick?.()
  }
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Se for arrastado, aumentar opacidade para dar destaque
  const draggingClass = isDragging
    ? 'opacity-30 ring-2 ring-primary rotate-2'
    : ''

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative cursor-grab border-border bg-card shadow-none transition-all hover:bg-card/80 ${draggingClass}`}
      onClick={handleCardClick}
    >
      <CardContent className="flex flex-col gap-4 p-3.5">
        {/* 1. Topo: Badge de Status + Prioridade */}
        <div>
          {/* Badge de Status */}
          {statusConfig[deal.status] && (
            <Badge
              variant="outline"
              className={`h-6 gap-1.5 px-2 text-[10px] font-semibold transition-colors ${statusConfig[deal.status].color}`}
            >
              <CircleIcon className="h-1.5 w-1.5 fill-current" />
              {statusConfig[deal.status].label}
            </Badge>
          )}
        </div>
        {/* 2. Sub-topo: Título do Deal */}
        <p className="line-clamp-2 cursor-pointer text-base font-semibold leading-tight text-foreground hover:text-primary">
          {deal.title}
        </p>
        {/* 3. Meio: Grid de Contato + Valor */}
        <div className="flex gap-4">
          {/* Coluna Contato */}
          <div className="flex flex-col gap-1">
            {/* <Label className="text-[10px] uppercase text-muted-foreground">
              Contato
            </Label> */}
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
          {/* Prioridade (Compacta) */}
          <div
            className="flex flex-col gap-0.5"
            data-priority-select
            onClick={(e) => e.stopPropagation()}
          >
            <Select value={priority} onValueChange={handlePriorityChange}>
              <SelectTrigger
                className={`h-6 w-auto border bg-transparent px-2 text-[9px] font-medium focus:ring-0 focus:ring-offset-0 ${priorityConfig[priority].color}`}
              >
                <div className="flex items-center gap-1 overflow-hidden">
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="px-2 py-1.5 text-xs font-bold uppercase text-muted-foreground">
                    Prioridade
                  </SelectLabel>
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-[10px]">
                      <span className={config.color}>{config.label}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 4. Base: Observações */}
        {deal.notes && (
          <div className="flex flex-col gap-1 border-t border-border/50 pt-2">
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
