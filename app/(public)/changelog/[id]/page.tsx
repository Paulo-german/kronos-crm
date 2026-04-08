import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  getChangelogEntryPublicById,
  getChangelogEntriesPublic,
} from '@/_data-access/changelog'
import type { ChangelogEntryType } from '@prisma/client'

interface ChangelogDetailPageProps {
  params: Promise<{ id: string }>
}

const TYPE_CONFIG: Record<
  ChangelogEntryType,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  NEW: {
    label: 'Novidade',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  IMPROVEMENT: {
    label: 'Melhoria',
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  FIX: {
    label: 'Correção',
    badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
}

export async function generateMetadata({
  params,
}: ChangelogDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const entry = await getChangelogEntryPublicById(id)

  if (!entry) {
    return { title: 'Não encontrado | Kronos CRM' }
  }

  return {
    title: `${entry.title} | Novidades | Kronos CRM`,
    description: entry.description.slice(0, 160),
  }
}

const ChangelogDetailPage = async ({ params }: ChangelogDetailPageProps) => {
  const { id } = await params
  const [entry, allEntries] = await Promise.all([
    getChangelogEntryPublicById(id),
    getChangelogEntriesPublic(),
  ])

  if (!entry) notFound()

  const config = TYPE_CONFIG[entry.type]
  const publishedDate = new Date(entry.publishedAt)

  const currentIndex = allEntries.findIndex((item) => item.id === id)
  const prevEntry = currentIndex < allEntries.length - 1 ? allEntries[currentIndex + 1] : null
  const nextEntry = currentIndex > 0 ? allEntries[currentIndex - 1] : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      {/* Voltar */}
      <Button variant="ghost" size="sm" className="mb-8 -ml-2 gap-1.5 text-muted-foreground" asChild>
        <Link href="/changelog">
          <ArrowLeft className="h-4 w-4" />
          Todas as novidades
        </Link>
      </Button>

      {/* Meta */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`gap-1 ${config.badgeClass}`}>
          {config.icon}
          {config.label}
        </Badge>
        <time
          dateTime={publishedDate.toISOString()}
          className="text-sm text-muted-foreground"
        >
          {formatDistanceToNow(publishedDate, {
            addSuffix: true,
            locale: ptBR,
          })}{' '}
          &middot;{' '}
          {format(publishedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </time>
      </div>

      {/* Título */}
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {entry.title}
      </h1>

      {/* Conteúdo */}
      <div className="prose prose-base dark:prose-invert max-w-none text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a:hover]:opacity-80 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mt-1.5 [&_ol]:my-3 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-3">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {entry.description}
        </ReactMarkdown>
      </div>

      {/* Navegação prev/next */}
      {(prevEntry || nextEntry) && (
        <div className="mt-12 flex items-stretch gap-4 border-t border-border/50 pt-8">
          {prevEntry ? (
            <Link
              href={`/changelog/${prevEntry.id}`}
              className="group flex flex-1 flex-col rounded-lg border border-border/50 p-4 transition-colors hover:bg-card/80"
            >
              <span className="mb-1 text-xs text-muted-foreground">Anterior</span>
              <span className="text-sm font-medium text-foreground group-hover:text-primary">
                {prevEntry.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {nextEntry ? (
            <Link
              href={`/changelog/${nextEntry.id}`}
              className="group flex flex-1 flex-col items-end rounded-lg border border-border/50 p-4 text-right transition-colors hover:bg-card/80"
            >
              <span className="mb-1 text-xs text-muted-foreground">Mais recente</span>
              <span className="text-sm font-medium text-foreground group-hover:text-primary">
                {nextEntry.title}
              </span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  )
}

export default ChangelogDetailPage
