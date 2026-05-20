'use client'

import { CalendarClock, Flag, MessageCircle, SquareCheckBigIcon } from 'lucide-react'

const STATUS_LEGEND = [
  { label: 'Novo', color: 'bg-kronos-blue' },
  { label: 'Em andamento', color: 'bg-kronos-purple' },
  { label: 'Vendido', color: 'bg-kronos-green' },
  { label: 'Perdido', color: 'bg-kronos-red' },
  { label: 'Pausado', color: 'bg-kronos-yellow' },
]

const PRIORITY_LEGEND = [
  { label: 'Baixa', color: 'text-muted-foreground border-muted-foreground/30' },
  { label: 'Média', color: 'text-kronos-blue border-kronos-blue/40' },
  { label: 'Alta', color: 'text-kronos-yellow border-kronos-yellow/40' },
  { label: 'Urgente', color: 'text-kronos-red border-kronos-red/40' },
]

export const DealCardLegend = () => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Status do negócio:</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {STATUS_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-sm ${item.color}`} />
              <span className="text-xs text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          <Flag className="mr-1 inline h-3 w-3" />
          Prioridade (canto superior direito):
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {PRIORITY_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <Flag className={`h-3 w-3 ${item.color}`} />
              <span className="text-xs text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">Contadores de atividade:</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SquareCheckBigIcon className="h-3 w-3" />
            <span>Tarefas vinculadas</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            <span>Agendamentos</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            <span>Conversas no inbox</span>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm text-muted-foreground">Indicador de inatividade:</p>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-xs text-muted-foreground">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-kronos-yellow" />
            <span className="text-xs text-muted-foreground">12+ dias</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-kronos-red" />
            <span className="text-xs text-muted-foreground">30+ dias</span>
          </div>
        </div>
      </div>
    </div>
  )
}
