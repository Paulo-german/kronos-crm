'use client'

import { useEffect, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { ContactFilterControls } from '@/_components/contacts/_components/contact-filter-controls'
import {
  DEFAULT_CONTACT_FILTERS,
  countActiveContactFilters,
  type ContactFilters,
} from '@/_components/contacts/_lib/contact-filters'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import { createSegment } from '@/_actions/segment/create-segment'
import { updateSegment } from '@/_actions/segment/update-segment'
import { previewSegmentCount } from '@/_actions/segment/preview-segment-count'
import type { SegmentDto } from '@/_data-access/segment/get-segments'

interface UpsertSegmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isScoreEnabled: boolean
  /** Quando presente, o dialog edita; senão, cria */
  segment?: SegmentDto | null
}

const DESCRIPTION_MAX = 500
// Espera após a última alteração de filtro antes de recalcular o preview
const PREVIEW_DEBOUNCE_MS = 350

export function UpsertSegmentDialog({
  open,
  onOpenChange,
  isScoreEnabled,
  segment,
}: UpsertSegmentDialogProps) {
  const isEdit = Boolean(segment)

  const [name, setName] = useState(segment?.name ?? '')
  const [description, setDescription] = useState(segment?.description ?? '')
  const [filters, setFilters] = useState<ContactFilters>(
    segment?.filters ?? DEFAULT_CONTACT_FILTERS,
  )

  const {
    execute: runPreview,
    result: previewResult,
    isPending: isCounting,
  } = useAction(previewSegmentCount)

  // Sincroniza o preview (contagem + amostra) com os filtros — debounced para
  // não disparar uma query a cada toggle/dígito do health score.
  useEffect(() => {
    const timer = setTimeout(() => runPreview(filters), PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [filters, runPreview])

  const createAction = useAction(createSegment, {
    onSuccess: () => {
      toast.success('Segmentação criada.')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar segmentação.')
    },
  })

  const updateAction = useAction(updateSegment, {
    onSuccess: () => {
      toast.success('Segmentação atualizada.')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar segmentação.')
    },
  })

  const isPending = createAction.isPending || updateAction.isPending
  const activeFilterCount = countActiveContactFilters(filters)
  const preview = previewResult.data
  const count = preview?.count

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      toast.error('Dê um nome com ao menos 2 caracteres.')
      return
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      filters,
    }
    if (isEdit && segment) {
      updateAction.execute({ id: segment.id, ...payload })
      return
    }
    createAction.execute(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {isEdit ? 'Editar segmentação' : 'Nova segmentação'}
          </DialogTitle>
          <DialogDescription>
            Defina filtros para agrupar contatos dinamicamente. A lista é
            reavaliada sempre que a segmentação é usada.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-9rem)] grid-cols-1 overflow-hidden md:grid-cols-[1fr_18rem]">
          {/* Coluna esquerda: dados + filtros */}
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="segment-name">Nome</Label>
                <Input
                  id="segment-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex: Leads sem negócio"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="segment-description">Descrição</Label>
                  <span className="text-xs text-muted-foreground">
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>
                <Input
                  id="segment-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Opcional"
                  maxLength={DESCRIPTION_MAX}
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Filtros</Label>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setFilters(DEFAULT_CONTACT_FILTERS)}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
              <ContactFilterControls
                filters={filters}
                onChange={setFilters}
                isScoreEnabled={isScoreEnabled}
              />
            </div>
          </div>

          {/* Coluna direita: resultado ao vivo */}
          <div className="flex flex-col gap-3 overflow-y-auto border-t bg-muted/30 px-5 py-5 md:border-l md:border-t-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" />
              Resultado
            </div>

            <div className="rounded-lg border bg-background p-4 text-center">
              {isCounting ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums">
                  {(count ?? 0).toLocaleString('pt-BR')}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeFilterCount === 0
                  ? 'todos os contatos elegíveis'
                  : 'contatos atingidos'}
              </p>
            </div>

            <SamplePanel
              contacts={preview?.sample ?? []}
              total={count ?? 0}
              isLoading={isCounting}
            />
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar segmentação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SamplePanelProps {
  contacts: { id: string; name: string; lifecycleStage: string }[]
  total: number
  isLoading: boolean
}

// Amostra dos contatos que casam com os filtros atuais
function SamplePanel({ contacts, total, isLoading }: SamplePanelProps) {
  if (isLoading && contacts.length === 0) {
    return null
  }

  if (contacts.length === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        Nenhum contato corresponde a estes filtros.
      </p>
    )
  }

  const remaining = total - contacts.length

  return (
    <div className="space-y-1.5">
      <p className="px-1 text-xs font-medium text-muted-foreground">Amostra</p>
      <ul className="space-y-1">
        {contacts.map((contact) => {
          const stageCfg =
            LIFECYCLE_STAGE_CONFIG[
              contact.lifecycleStage as keyof typeof LIFECYCLE_STAGE_CONFIG
            ]
          return (
            <li
              key={contact.id}
              className="flex items-center justify-between gap-2 rounded-md bg-background px-2.5 py-1.5"
            >
              <span className="truncate text-xs">{contact.name}</span>
              {stageCfg && (
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 gap-1 text-[10px] font-normal',
                    stageCfg.badgeClassName,
                  )}
                >
                  <stageCfg.icon className="size-2.5" />
                  {stageCfg.label}
                </Badge>
              )}
            </li>
          )
        })}
      </ul>
      {remaining > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          + {remaining.toLocaleString('pt-BR')} contatos
        </p>
      )}
    </div>
  )
}
