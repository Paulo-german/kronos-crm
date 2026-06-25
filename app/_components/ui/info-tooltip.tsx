'use client'

import type { ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'

interface InfoTooltipProps {
  /** Conteúdo explicativo exibido no tooltip. */
  children: ReactNode
  className?: string
  iconClassName?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * Ícone de ajuda "(?)" com tooltip explicativo. Usado ao lado de métricas e
 * títulos para deixar claro, em linguagem simples, o que cada número significa
 * — sem o usuário precisar adivinhar.
 */
export function InfoTooltip({
  children,
  className,
  iconClassName,
  side = 'top',
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Mais informações"
            className={cn(
              'inline-flex shrink-0 items-center justify-center text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:text-muted-foreground focus-visible:outline-none',
              className,
            )}
            // Evita que o clique no ícone dispare ações do card-pai (ex.: drill-down).
            onClick={(event) => event.stopPropagation()}
          >
            <HelpCircle className={cn('size-3.5', iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-[260px] text-xs font-normal leading-relaxed"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
