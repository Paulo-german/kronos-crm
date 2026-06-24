'use client'

import { useState } from 'react'
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
import { Textarea } from '@/_components/ui/textarea'
import { ContactsFiltersSheet } from '@/_components/contacts/_components/contacts-filters-sheet'
import {
  DEFAULT_CONTACT_FILTERS,
  countActiveContactFilters,
  type ContactFilters,
} from '@/_components/contacts/_lib/contact-filters'
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
  const count = previewResult.data?.count

  const handleApplyFilters = (applied: Partial<ContactFilters>) => {
    const merged = { ...filters, ...applied }
    setFilters(merged)
    runPreview(merged)
  }

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar segmentação' : 'Nova segmentação'}
          </DialogTitle>
          <DialogDescription>
            Defina filtros para agrupar contatos dinamicamente. A lista é
            reavaliada sempre que a segmentação é usada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
            <Label htmlFor="segment-description">Descrição (opcional)</Label>
            <Textarea
              id="segment-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Para que serve esta segmentação?"
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Filtros</Label>
            <div className="flex items-center gap-3">
              <ContactsFiltersSheet
                filters={filters}
                onApplyFilters={handleApplyFilters}
                activeFilterCount={activeFilterCount}
                isScoreEnabled={isScoreEnabled}
              />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {isCounting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : count !== undefined ? (
                  <span>
                    <span className="font-semibold text-foreground">
                      {count.toLocaleString('pt-BR')}
                    </span>{' '}
                    contatos
                  </span>
                ) : (
                  <span>Aplique filtros para ver o total</span>
                )}
              </div>
            </div>
            {activeFilterCount === 0 && (
              <p className="text-xs text-muted-foreground">
                Sem filtros, a segmentação inclui todos os contatos elegíveis.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
