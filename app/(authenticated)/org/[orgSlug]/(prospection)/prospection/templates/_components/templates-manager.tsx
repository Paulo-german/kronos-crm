'use client'

import { useMemo, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { FileText, Loader2, RefreshCw, Search } from 'lucide-react'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Card, CardContent, CardHeader } from '@/_components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { TemplatePreview } from '@/_components/whatsapp/template-preview'
import { listWhatsAppTemplates } from '@/_actions/inbox/list-whatsapp-templates'
import type { EligibleInbox } from '@/_data-access/broadcast/get-eligible-inboxes'
import type { MetaTemplate } from '@/_lib/meta/types'

type TemplateStatus = MetaTemplate['status']
type TemplateCategory = MetaTemplate['category']

const STATUS_META: Record<
  TemplateStatus,
  { label: string; className: string }
> = {
  APPROVED: {
    label: 'Aprovado',
    className: 'bg-kronos-green/10 text-kronos-green border-kronos-green/20',
  },
  PENDING: {
    label: 'Pendente',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  REJECTED: {
    label: 'Rejeitado',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  PAUSED: {
    label: 'Pausado',
    className: 'bg-muted text-muted-foreground border-border',
  },
  DISABLED: {
    label: 'Desativado',
    className: 'bg-muted text-muted-foreground border-border',
  },
  IN_APPEAL: {
    label: 'Em recurso',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

const STATUS_FILTERS: { value: TemplateStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'REJECTED', label: 'Rejeitados' },
]

const CATEGORY_FILTERS: { value: TemplateCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todas as categorias' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'UTILITY', label: 'Utilidade' },
  { value: 'AUTHENTICATION', label: 'Autenticação' },
]

interface TemplatesManagerProps {
  inboxes: EligibleInbox[]
  initialInboxId: string
  initialTemplates: MetaTemplate[]
}

export function TemplatesManager({
  inboxes,
  initialInboxId,
  initialTemplates,
}: TemplatesManagerProps) {
  const [selectedInboxId, setSelectedInboxId] = useState(initialInboxId)
  const [templates, setTemplates] = useState<MetaTemplate[]>(initialTemplates)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'ALL'>(
    'ALL',
  )
  const [categoryFilter, setCategoryFilter] = useState<
    TemplateCategory | 'ALL'
  >('ALL')

  const { execute: loadTemplates, isPending } = useAction(
    listWhatsAppTemplates,
    {
      onSuccess: ({ data }) => setTemplates(data ?? []),
      onError: ({ error }) => {
        setTemplates([])
        toast.error(
          error.serverError ?? 'Não foi possível carregar os templates.',
        )
      },
    },
  )

  const handleInboxChange = (value: string) => {
    setSelectedInboxId(value)
    loadTemplates({ inboxId: value })
  }

  const handleSync = () => {
    loadTemplates({ inboxId: selectedInboxId })
    toast.info('Sincronizando templates com a Meta...')
  }

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase()
    return templates.filter((template) => {
      if (statusFilter !== 'ALL' && template.status !== statusFilter) {
        return false
      }
      if (categoryFilter !== 'ALL' && template.category !== categoryFilter) {
        return false
      }
      if (term && !template.name.toLowerCase().includes(term)) {
        return false
      }
      return true
    })
  }, [templates, search, statusFilter, categoryFilter])

  const showInboxSelector = inboxes.length > 1

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {showInboxSelector && (
          <Select value={selectedInboxId} onValueChange={handleInboxChange}>
            <SelectTrigger className="md:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inboxes.map((inbox) => (
                <SelectItem key={inbox.id} value={inbox.id}>
                  {inbox.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar template pelo nome..."
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as TemplateStatus | 'ALL')
          }
        >
          <SelectTrigger className="md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(value) =>
            setCategoryFilter(value as TemplateCategory | 'ALL')
          }
        >
          <SelectTrigger className="md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleSync} disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Sincronizar
        </Button>
      </div>

      {/* Lista */}
      {isPending ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-1 text-sm font-medium">
            {templates.length === 0
              ? 'Nenhum template nesta caixa'
              : 'Nenhum template corresponde aos filtros'}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {templates.length === 0
              ? 'Crie e aprove templates no Meta Business Manager. Depois clique em Sincronizar para vê-los aqui.'
              : 'Ajuste a busca, o status ou a categoria.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={`${template.name}-${template.language}`}
              template={template}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TemplateCardProps {
  template: MetaTemplate
}

function TemplateCard({ template }: TemplateCardProps) {
  const status = STATUS_META[template.status]

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <span className="break-all font-mono text-sm font-medium">
            {template.name}
          </span>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] font-semibold ${status.className}`}
          >
            {status.label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {CATEGORY_LABELS[template.category]}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            {template.language}
          </Badge>
          {template.quality_score &&
            template.quality_score.score !== 'UNKNOWN' && (
              <Badge variant="outline" className="text-[10px]">
                Qualidade: {template.quality_score.score}
              </Badge>
            )}
        </div>
      </CardHeader>
      <CardContent className="mt-auto">
        <TemplatePreview template={template} />
      </CardContent>
    </Card>
  )
}
