'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, Building2, User } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'

interface KanbanCardProps {
  deal: DealDto
  onClick?: () => void
}

export function KanbanCard({ deal, onClick }: KanbanCardProps) {
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

  // Formata valor para BRL
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(deal.totalValue)

  // Formata data
  const formattedDate = deal.expectedCloseDate
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
      }).format(new Date(deal.expectedCloseDate))
    : null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab border-border bg-card transition-shadow hover:shadow-md ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="space-y-3 p-6">
        <p className="line-clamp-2 font-medium">{deal.title}</p>

        {deal.totalValue > 0 && (
          <p className="text-sm font-semibold text-primary">{formattedValue}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {deal.contactName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {deal.contactName}
            </span>
          )}

          {deal.companyName && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {deal.companyName}
            </span>
          )}

          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
