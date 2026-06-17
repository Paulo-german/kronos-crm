'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  CalendarClock,
  DollarSign,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Calendar } from '@/_components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import { updateDeal } from '@/_actions/deal/update-deal'
import { moveDealToStage } from '@/_actions/deal/move-deal-to-stage'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import {
  PRIORITY_CONFIG,
  DEAL_PRIORITIES,
  type DealPriority,
} from '@/_lib/deal/deal-display-config'

interface DealInfoCardProps {
  deal: DealDetailsDto
  onTabChange?: (tab: string) => void
}

const DealInfoCard = ({ deal, onTabChange }: DealInfoCardProps) => {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(deal.title)

  const { execute, isPending } = useAction(updateDeal, {
    onSuccess: () => {
      toast.success('Título atualizado!')
      setEditingTitle(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar título.')
    },
  })

  const { execute: executeStageChange, isPending: isChangingStage } = useAction(
    moveDealToStage,
    {
      onSuccess: () => {
        toast.success('Etapa atualizada!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao mudar etapa.')
      },
    },
  )

  const { execute: executePriority, isPending: isChangingPriority } = useAction(
    updateDeal,
    {
      onSuccess: () => {
        toast.success('Prioridade atualizada!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao mudar prioridade.')
      },
    },
  )

  const [isDateOpen, setIsDateOpen] = useState(false)
  const { execute: executeDate, isPending: isChangingDate } = useAction(
    updateDeal,
    {
      onSuccess: () => {
        toast.success('Previsão atualizada!')
        setIsDateOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar previsão.')
      },
    },
  )

  const handleSaveTitle = () => {
    if (!titleValue.trim()) {
      toast.error('O título não pode estar vazio.')
      return
    }
    execute({
      id: deal.id,
      title: titleValue.trim(),
    })
  }

  const handleCancelTitle = () => {
    setTitleValue(deal.title)
    setEditingTitle(false)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Não definida'
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Informações da Negociação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Título Editável */}
        <div className="border-b pb-4">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="text-lg font-medium"
                placeholder="Título do deal"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveTitle}
                disabled={isPending}
              >
                <Check className="h-4 w-4 text-kronos-green" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancelTitle}
                disabled={isPending}
              >
                <X className="h-4 w-4 text-kronos-red" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-sm leading-tight">{deal.title}</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditingTitle(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Valor Total */}
        <div
          role="button"
          tabIndex={0}
          className="flex cursor-pointer items-center gap-3 rounded-md bg-primary/5 p-3 transition-colors hover:bg-primary/10"
          onClick={() => onTabChange?.('products')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTabChange?.('products')
            }
          }}
        >
          <div className="rounded-full bg-primary/10 p-2">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(deal.totalValue)}
            </p>
          </div>
        </div>

        {/* Stage do Pipeline */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Etapa</p>
          <Select
            value={deal.stageId}
            onValueChange={(stageId) => {
              executeStageChange({
                dealId: deal.id,
                stageId,
              })
            }}
            disabled={isChangingStage}
          >
            <SelectTrigger className="font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deal.availableStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <div className="flex items-center gap-2">{stage.name}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prioridade */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Prioridade
          </p>
          <Select
            value={deal.priority}
            onValueChange={(priority) => {
              executePriority({
                id: deal.id,
                priority: priority as DealPriority,
              })
            }}
            disabled={isChangingPriority}
          >
            <SelectTrigger className="font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_PRIORITIES.map((priority) => {
                const PriorityIcon = PRIORITY_CONFIG[priority].icon
                return (
                  <SelectItem key={priority} value={priority}>
                    <div className="flex items-center gap-2">
                      <PriorityIcon
                        className={cn(
                          'size-3.5',
                          PRIORITY_CONFIG[priority].color,
                        )}
                      />
                      {PRIORITY_CONFIG[priority].label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Datas */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              Criado em
            </span>
            <span className="font-medium">{formatDate(deal.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Previsão
            </span>
            <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 font-medium"
                  disabled={isChangingDate}
                >
                  {deal.expectedCloseDate
                    ? format(new Date(deal.expectedCloseDate), 'dd/MM/yyyy')
                    : 'Definir'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={
                    deal.expectedCloseDate
                      ? new Date(deal.expectedCloseDate)
                      : undefined
                  }
                  onSelect={(date) => {
                    if (date) {
                      executeDate({ id: deal.id, expectedCloseDate: date })
                    }
                  }}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DealInfoCard
