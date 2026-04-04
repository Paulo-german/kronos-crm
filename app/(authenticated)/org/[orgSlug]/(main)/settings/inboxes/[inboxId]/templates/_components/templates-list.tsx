'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarIcon,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Input } from '@/_components/ui/input'
import { Card, CardContent } from '@/_components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'
import { listWhatsAppTemplates } from '@/_actions/inbox/list-whatsapp-templates'
import type {
  MetaTemplate,
  MetaTemplateStatus,
  MetaQualityScore,
} from '@/_lib/meta/types'
import { CreateTemplateDialog } from './create-template-dialog'
import { DeleteTemplateDialog } from './delete-template-dialog'
import { TemplatePreview } from './template-preview'

// ---------------------------------------------------------------------------
// Configurações de status
// ---------------------------------------------------------------------------

type StatusConfig = {
  label: string
  className: string
  dotColor: string
}

const STATUS_CONFIG: Record<MetaTemplateStatus, StatusConfig> = {
  APPROVED: {
    label: 'Aprovado',
    className: 'bg-kronos-green/10 text-kronos-green border-kronos-green/20',
    dotColor: 'bg-kronos-green',
  },
  PENDING: {
    label: 'Pendente',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
  REJECTED: {
    label: 'Rejeitado',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    dotColor: 'bg-destructive',
  },
  PAUSED: {
    label: 'Pausado',
    className: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
  },
  DISABLED: {
    label: 'Desabilitado',
    className: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
  },
  IN_APPEAL: {
    label: 'Em apelação',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    dotColor: 'bg-blue-500',
  },
}

// ---------------------------------------------------------------------------
// Configurações de quality score
// ---------------------------------------------------------------------------

type QualityConfig = {
  label: string
  dotColor: string
}

const QUALITY_CONFIG: Record<MetaQualityScore, QualityConfig> = {
  GREEN: { label: 'GREEN', dotColor: 'bg-kronos-green' },
  YELLOW: { label: 'YELLOW', dotColor: 'bg-amber-500' },
  RED: { label: 'RED', dotColor: 'bg-destructive' },
  UNKNOWN: { label: 'UNKNOWN', dotColor: 'bg-muted-foreground' },
}

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

type FilterTab = 'all' | 'approved' | 'pending' | 'rejected'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplatesListProps {
  inboxId: string
  inboxName: string
  orgSlug: string
  initialTemplates: MetaTemplate[]
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function TemplatesList({
  inboxId,
  inboxName,
  orgSlug,
  initialTemplates,
}: TemplatesListProps) {
  const [templates, setTemplates] = useState<MetaTemplate[]>(initialTemplates)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [previewTarget, setPreviewTarget] = useState<MetaTemplate | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const { execute: executeRefresh, isPending: isRefreshing } = useAction(
    listWhatsAppTemplates,
    {
      onSuccess: ({ data }) => {
        if (data) setTemplates(data)
        toast.success('Lista de templates atualizada.')
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao buscar templates.')
      },
    },
  )

  const handleRefresh = () => {
    executeRefresh({ inboxId })
  }

  // Filtro derivado por aba e busca — sem useEffect
  const filteredTemplates = useMemo(() => {
    const byTab = templates.filter((template) => {
      if (activeTab === 'all') return true
      if (activeTab === 'approved') return template.status === 'APPROVED'
      if (activeTab === 'pending') return template.status === 'PENDING'
      if (activeTab === 'rejected')
        return (
          template.status === 'REJECTED' ||
          template.status === 'PAUSED' ||
          template.status === 'DISABLED'
        )
      return true
    })

    if (!search.trim()) return byTab

    const lower = search.toLowerCase()
    return byTab.filter(
      (template) =>
        template.name.toLowerCase().includes(lower) ||
        template.language.toLowerCase().includes(lower),
    )
  }, [templates, activeTab, search])

  const counts = useMemo(
    () => ({
      all: templates.length,
      approved: templates.filter((template) => template.status === 'APPROVED').length,
      pending: templates.filter((template) => template.status === 'PENDING').length,
      rejected: templates.filter(
        (template) =>
          template.status === 'REJECTED' ||
          template.status === 'PAUSED' ||
          template.status === 'DISABLED',
      ).length,
    }),
    [templates],
  )

  const isEmptyList = templates.length === 0
  const isEmptyFiltered = filteredTemplates.length === 0 && !isEmptyList

  return (
    <div className="space-y-6">
      {/* Botão voltar */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings/inboxes/${inboxId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para {inboxName}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <Header>
        <HeaderLeft>
          <HeaderTitle>Templates</HeaderTitle>
          <HeaderSubTitle>
            Gerencie os templates de mensagem do WhatsApp para este inbox.
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar template
          </Button>
        </HeaderRight>
      </Header>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as FilterTab)}
          className="flex-1"
        >
          <TabsList className="grid h-12 w-full max-w-md grid-cols-4 border border-border/50 bg-tab/30">
            <TabsTrigger value="all">
              Todos
              {counts.all > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
                >
                  {counts.all}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprovados
              {counts.approved > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
                >
                  {counts.approved}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes
              {counts.pending > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
                >
                  {counts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejeitados
              {counts.rejected > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-4 min-w-4 px-1 text-[10px]"
                >
                  {counts.rejected}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome..."
            className="h-10 w-56 pl-9"
          />
        </div>
      </div>

      {/* Empty state: sem nenhum template */}
      {isEmptyList && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-full bg-muted p-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              Nenhum template encontrado
            </h3>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro template para enviar mensagens proativas pelo
              WhatsApp.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar template
          </Button>
        </div>
      )}

      {/* Empty state: filtros sem resultado */}
      {isEmptyFiltered && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 py-16">
          <p className="text-base font-medium">
            Nenhum template corresponde aos filtros
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente mudar os filtros ou o termo de busca.
          </p>
        </div>
      )}

      {/* Grid de cards */}
      {!isEmptyList && !isEmptyFiltered && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={`${template.name}-${template.language}`}
              template={template}
              onDelete={() => setDeleteTarget(template.name)}
              onPreview={() => setPreviewTarget(template)}
            />
          ))}

          {/* Card "+" para criar novo template */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="min-h-[180px] cursor-pointer rounded-xl border-2 border-dashed bg-muted/30 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <div className="rounded-full border-2 border-dashed p-2">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Novo template
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Dialogs */}
      <CreateTemplateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        inboxId={inboxId}
        onCreated={handleRefresh}
      />

      <DeleteTemplateDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        inboxId={inboxId}
        templateName={deleteTarget ?? ''}
        onDeleted={() => {
          setDeleteTarget(null)
          handleRefresh()
        }}
      />

      {/* Dialog de preview */}
      <Dialog
        open={!!previewTarget}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewTarget?.name}</DialogTitle>
            <DialogDescription>
              Preview do template no estilo WhatsApp
            </DialogDescription>
          </DialogHeader>
          {previewTarget && <TemplatePreview template={previewTarget} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card individual de template
// ---------------------------------------------------------------------------

interface TemplateCardProps {
  template: MetaTemplate
  onDelete: () => void
  onPreview: () => void
}

function TemplateCard({ template, onDelete, onPreview }: TemplateCardProps) {
  const statusConfig = STATUS_CONFIG[template.status] ?? STATUS_CONFIG.DISABLED
  const bodyComponent = template.components.find((c) => c.type === 'BODY')
  const bodyPreview = bodyComponent?.text

  const qualityScore = template.quality_score?.score
  const qualityConfig = qualityScore ? QUALITY_CONFIG[qualityScore] : null

  const formattedDate = template.quality_score?.date
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }).format(new Date(template.quality_score.date))
    : null

  return (
    <div className="group cursor-pointer" onClick={onPreview}>
      <Card className="flex min-h-[180px] flex-col transition-colors hover:border-primary/50">
        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          {/* Topo: status badge + dropdown */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={`gap-1.5 ${statusConfig.className}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor}`} />
              {statusConfig.label}
            </Badge>

            {/* stopPropagation para o dropdown não disparar o onClick do card */}
            <div onClick={(event) => event.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onPreview}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver preview
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Nome + badges de idioma e categoria */}
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold leading-tight">
              {template.name}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{template.language}</Badge>
              <Badge variant="secondary">
                {CATEGORY_LABELS[template.category] ?? template.category}
              </Badge>
            </div>
          </div>

          {/* Preview do body */}
          {bodyPreview && (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {bodyPreview}
            </p>
          )}

          {/* Footer: quality score + data */}
          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {qualityConfig ? (
                <>
                  <span
                    className={`h-2 w-2 rounded-full ${qualityConfig.dotColor}`}
                  />
                  <span>{qualityConfig.label}</span>
                </>
              ) : (
                <span>—</span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{formattedDate ?? '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
