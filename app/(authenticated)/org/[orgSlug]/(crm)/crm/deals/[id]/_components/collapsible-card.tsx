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
        'overflow-hidden border border-border/50 bg-card transition-colors',
        !open && 'cursor-pointer hover:bg-muted/40',
      )}
      // Colapsado: clicar em qualquer lugar do card abre. Aberto: só o header fecha,
      // pra não interferir com os cliques no conteúdo.
      onClick={open ? undefined : () => setOpen(true)}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-6 py-4">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setOpen((prev) => !prev)
          }}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold"
        >
          {icon}
          {title}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300',
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

      {/* Resumo (visível só quando fechado) — crossfade com o conteúdo */}
      {summary && (
        <div
          aria-hidden={open}
          className={cn(
            ANIM,
            open ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
          )}
        >
          <div className="overflow-hidden">
            <CardContent className="px-6 pb-5 pt-0">{summary}</CardContent>
          </div>
        </div>
      )}

      {/* Conteúdo real — anima abrir/fechar via grid-template-rows (0fr ↔ 1fr) + fade */}
      <div
        aria-hidden={!open}
        className={cn(
          ANIM,
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className={cn('overflow-hidden', !open && 'pointer-events-none')}>
          <CardContent className="px-6 pb-5 pt-0">{children}</CardContent>
        </div>
      </div>
    </Card>
  )
}

/**
 * Linha de resumo padrão (label à esquerda, valor à direita) para manter
 * consistência estética entre os resumos dos cards colapsados.
 */
export const SummaryRow = ({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-foreground">
      {value}
    </span>
  </div>
)

export default CollapsibleCard
