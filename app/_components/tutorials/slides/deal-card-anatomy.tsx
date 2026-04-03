'use client'

import { ChevronDown, CircleIcon, Clock } from 'lucide-react'

/**
 * Card mockado com o estilo real do kanban-card.tsx.
 * Renderizado na coluna direita pelo TutorialSlideContent.
 */
export const DealCardAnatomy = () => {
  return (
    <div className="w-full max-w-[300px] rounded-xl border border-border bg-card shadow-none">
      <div className="flex flex-col gap-4 p-3.5">
        {/* 1. Badge de Status */}
        <div>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-kronos-purple/20 bg-kronos-purple/10 px-2 text-[10px] font-semibold text-kronos-purple">
            <CircleIcon className="h-1.5 w-1.5 fill-current" />
            EM ANDAMENTO
          </span>
        </div>

        {/* 2. Título */}
        <p className="line-clamp-2 text-base font-semibold leading-tight text-foreground">
          Automação de Vendas
        </p>

        {/* 3. Contato + Valor + Prioridade */}
        <div className="flex gap-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-kronos-purple">
            FA
          </div>
          <div className="flex h-6 items-center">
            <span className="inline-flex items-center rounded-md text-xs font-bold text-foreground">
              R$ 45.000,00
            </span>
          </div>
          <div className="flex h-6 items-center gap-1 rounded-md border border-kronos-yellow/40 bg-transparent px-2 text-[9px] font-medium text-kronos-yellow">
            ALTA
            <ChevronDown className="h-3 w-3 opacity-50" />
          </div>
        </div>

        {/* 4. Indicador de Inatividade */}
        <div className="flex items-center justify-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-2 text-xs font-medium text-amber-500">
          <Clock className="h-3 w-3" />
          <span>12 dias sem atividade</span>
        </div>

        {/* 5. Observações */}
        <div className="flex flex-col gap-1 border-t border-border/50 pt-2">
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            Observações
          </span>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            Equipe de 8 vendedores. Querem automatizar follow-up pós-demo.
          </p>
        </div>
      </div>
    </div>
  )
}
