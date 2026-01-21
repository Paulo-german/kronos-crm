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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { updateDealPriority } from '@/_actions/deal/update-deal-priority'
import { formatCurrency } from '@/_helpers/format-currency'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'

interface KanbanCardProps {
  deal: DealDto
  onClick?: () => void
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média', color: 'bg-primary/20 text-primary' },
  high: { label: 'Alta', color: 'bg-amber-500/20 text-amber-500' },
  urgent: { label: 'Urgente', color: 'bg-destructive/20 text-destructive' },
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab border-border bg-card transition-all hover:border-primary/50 hover:shadow-[0_0_15px_-5px_var(--color-primary)] ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''
      }`}
      onClick={handleCardClick}
    >
      <CardContent className="space-y-3 p-4">
        {/* Header: Título do Deal + Prioridade */}
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 flex-1 font-medium">{deal.title}</p>

          <div data-priority-select onClick={(e) => e.stopPropagation()}>
            <Select value={priority} onValueChange={handlePriorityChange}>
              <SelectTrigger
                className={`h-7 w-auto gap-1 border-0 px-2 text-xs ${priorityConfig[priority].color}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className={`text-xs ${config.color}`}>
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contato */}
        {deal.contactName && (
          <p className="text-sm text-muted-foreground">{deal.contactName}</p>
        )}

        {/* Footer: Valor */}
        {deal.totalValue > 0 && (
          <div className="pt-1">
            <span className="inline-block rounded-md bg-[#00b37e]/20 px-3 py-1.5 text-sm font-semibold text-[#00b37e]">
              {formattedValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default KanbanCard
