import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import type { ChangelogEntryPublicDto } from '@/_data-access/changelog/types'
import type { ChangelogEntryType } from '@prisma/client'

interface ChangelogEntryCardProps {
  entry: ChangelogEntryPublicDto
}

const TYPE_CONFIG: Record<
  ChangelogEntryType,
  {
    label: string
    badgeClass: string
    dotClass: string
    icon: React.ReactNode
  }
> = {
  NEW: {
    label: 'Novidade',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    dotClass: 'bg-emerald-500',
    icon: <Sparkles className="h-3 w-3" />,
  },
  IMPROVEMENT: {
    label: 'Melhoria',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    dotClass: 'bg-blue-500',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  FIX: {
    label: 'Correção',
    badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    dotClass: 'bg-amber-500',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
}

export const ChangelogEntryCard = ({ entry }: ChangelogEntryCardProps) => {
  const config = TYPE_CONFIG[entry.type]
  const publishedDate = new Date(entry.publishedAt)

  return (
    <article className="relative pb-8 last:pb-0">
      {/* Dot na timeline */}
      <div
        className={`absolute -left-[calc(1.5rem+5px)] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background sm:-left-[calc(2rem+5px)] ${config.dotClass}`}
      />

      {/* Card clicável */}
      <Link
        href={`/changelog/${entry.id}`}
        className="group block rounded-lg border border-border/50 bg-card/50 p-5 transition-colors hover:border-border hover:bg-card/80"
      >
        {/* Meta: badge + data */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`gap-1 ${config.badgeClass}`}>
            {config.icon}
            {config.label}
          </Badge>
          <time
            dateTime={publishedDate.toISOString()}
            className="text-xs text-muted-foreground"
          >
            {formatDistanceToNow(publishedDate, {
              addSuffix: true,
              locale: ptBR,
            })}{' '}
            &middot;{' '}
            {format(publishedDate, "d 'de' MMMM", { locale: ptBR })}
          </time>
        </div>

        {/* Título */}
        <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
          {entry.title}
        </h3>

        {/* Preview da descrição (2 linhas) */}
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {entry.description.replace(/[#*\-_`>\[\]]/g, '').slice(0, 200)}
        </p>

        {/* Ler mais */}
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Ler mais
          <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
    </article>
  )
}
