'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'

interface CollapsibleCardProps {
  title: string
  /** Ícone à esquerda do título. */
  icon?: ReactNode
  /** Renderizado apenas quando o card está fechado. */
  summary?: ReactNode
  /** Slot à direita do header — fora do trigger, não dispara o toggle. */
  headerActions?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

// Transição suave via grid-template-rows (0fr ↔ 1fr) + fade. Evita o "snap"
// do height animation e dá um crossfade orgânico entre resumo e conteúdo.
const ANIM = 'grid transition-all duration-300 ease-in-out'

const CollapsibleCard = ({
  title,
  icon,
  summary,
  headerActions,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card
      className={cn(
        'border border-border/50 bg-card',
        !open && 'cursor-pointer',
      )}
      // Colapsado: clicar em qualquer lugar do card abre. Aberto: só o header fecha,
      // pra não interferir com os cliques no conteúdo.
      onClick={open ? undefined : () => setOpen(true)}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setOpen((prev) => !prev)
          }}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-base font-semibold"
        >
          {icon}
          {title}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-300',
              open && 'rotate-180',
            )}
          />
        </button>
        {headerActions && (
          <div onClick={(event) => event.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </CardHeader>

      {/* Resumo (visível só quando fechado) */}
      {summary && (
        <div
          aria-hidden={open}
          className={cn(
            ANIM,
            open ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
          )}
        >
          <div className="overflow-hidden">
            <CardContent className="pt-0 text-sm text-muted-foreground">
              {summary}
            </CardContent>
          </div>
        </div>
      )}

      {/* Conteúdo real (visível só quando aberto) */}
      <div
        aria-hidden={!open}
        className={cn(
          ANIM,
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className={cn('overflow-hidden', !open && 'pointer-events-none')}>
          <CardContent>{children}</CardContent>
        </div>
      </div>
    </Card>
  )
}

export default CollapsibleCard
