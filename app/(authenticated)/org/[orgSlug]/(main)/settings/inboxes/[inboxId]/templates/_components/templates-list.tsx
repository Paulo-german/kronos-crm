'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Eye,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Input } from '@/_components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/_components/ui/tabs'
import { Skeleton } from '@/_components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { listWhatsAppTemplates } from '@/_actions/inbox/list-whatsapp-templates'
import type { MetaTemplate, MetaTemplateStatus } from '@/_lib/meta/types'
import { CreateTemplateDialog } from './create-template-dialog'
import { DeleteTemplateDialog } from './delete-template-dialog'
import { TemplatePreview } from './template-preview'

// ---------------------------------------------------------------------------
// Helpers de badge
// ---------------------------------------------------------------------------

type StatusConfig = {
  label: string
  className: string
}

const STATUS_CONFIG: Record<MetaTemplateStatus, StatusConfig> = {
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
    label: 'Desabilitado',
    className: 'bg-muted text-muted-foreground border-border',
  },
  IN_APPEAL: {
    label: 'Em apelação',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

type FilterTab = 'all' | 'approved' | 'pending' | 'rejected'

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

  // Filtro inline por aba e busca — derivação sem useEffect
  const filteredTemplates = useMemo(() => {
    const byTab = templates.filter((template) => {
      if (activeTab === 'all') return true
      if (activeTab === 'approved') return template.status === 'APPROVED'
      if (activeTab === 'pending') return template.status === 'PENDING'
      if (activeTab === 'rejected')
        return template.status === 'REJECTED' || template.status === 'PAUSED' || template.status === 'DISABLED'
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

  const counts = useMemo(() => ({
    all: templates.length,
    approved: templates.filter((template) => template.status === 'APPROVED').length,
    pending: templates.filter((template) => template.status === 'PENDING').length,
    rejected: templates.filter((template) => template.status === 'REJECTED' || template.status === 'PAUSED' || template.status === 'DISABLED').length,
  }), [templates])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={`/org/${orgSlug}/settings/inboxes/${inboxId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para {inboxName}
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie os templates de mensagem do WhatsApp para este inbox.
            </p>
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

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
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                  {counts.all}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprovados
              {counts.approved > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                  {counts.approved}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes
              {counts.pending > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                  {counts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejeitados
              {counts.rejected > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
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

      {/* Lista de templates */}
      {isRefreshing && templates.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="border-border/50">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-1 h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 py-16">
          <p className="text-base font-medium">
            {templates.length === 0
              ? 'Nenhum template encontrado'
              : 'Nenhum template corresponde aos filtros'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {templates.length === 0
              ? 'Clique em "Criar template" para adicionar seu primeiro template.'
              : 'Tente mudar os filtros ou o termo de busca.'}
          </p>
          {templates.length === 0 && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={`${template.name}-${template.language}`}
              template={template}
              onDelete={() => setDeleteTarget(template.name)}
              onPreview={() => setPreviewTarget(template)}
            />
          ))}
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

      {/* Dialog de preview completo */}
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
  const bodyPreview = bodyComponent?.text?.slice(0, 120)

  return (
    <Card className="border-border/50 bg-secondary/10 transition-colors hover:bg-secondary/20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate font-mono text-sm">{template.name}</CardTitle>
            <CardDescription className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span>{template.language}</span>
              <span className="text-border">·</span>
              <span>{CATEGORY_LABELS[template.category] ?? template.category}</span>
            </CardDescription>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={`h-5 px-1.5 text-[10px] font-semibold ${statusConfig.className}`}
            >
              {statusConfig.label}
            </Badge>

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
      </CardHeader>

      {bodyPreview && (
        <CardContent className="pt-0">
          <p className="line-clamp-3 text-xs text-muted-foreground">{bodyPreview}</p>
        </CardContent>
      )}
    </Card>
  )
}
