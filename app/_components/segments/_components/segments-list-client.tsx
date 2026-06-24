'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { Filter, Plus, Pencil, Trash2, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Button } from '@/_components/ui/button'
import { Card } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { countActiveContactFilters } from '@/_components/contacts/_lib/contact-filters'
import { deleteSegment } from '@/_actions/segment/delete-segment'
import type { SegmentDto } from '@/_data-access/segment/get-segments'
import { UpsertSegmentDialog } from './upsert-segment-dialog'

interface SegmentsListClientProps {
  segments: SegmentDto[]
  isScoreEnabled: boolean
  withinQuota: boolean
  /** Limite do plano — 0 significa recurso bloqueado (Light) */
  limit: number
}

export function SegmentsListClient({
  segments,
  isScoreEnabled,
  withinQuota,
  limit,
}: SegmentsListClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SegmentDto | null>(null)
  const [toDelete, setToDelete] = useState<SegmentDto | null>(null)

  const deleteAction = useAction(deleteSegment, {
    onSuccess: () => {
      toast.success('Segmentação excluída.')
      setToDelete(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao excluir segmentação.')
    },
  })

  const isLocked = limit === 0

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (segment: SegmentDto) => {
    setEditing(segment)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Segmentações</HeaderTitle>
          <HeaderSubTitle>
            Listas dinâmicas de contatos definidas por filtros, reutilizáveis em
            disparos e outras ações.
          </HeaderSubTitle>
        </HeaderLeft>
        {!isLocked && (
          <HeaderRight>
            <Button
              onClick={openCreate}
              disabled={!withinQuota}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova segmentação
            </Button>
          </HeaderRight>
        )}
      </Header>

      {isLocked && (
        <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-1 text-sm font-medium">
            Disponível a partir do plano Essential
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Crie listas dinâmicas de contatos por filtros e reutilize-as em
            disparos. Faça upgrade do plano para habilitar.
          </p>
        </Card>
      )}

      {!isLocked && segments.length === 0 && (
        <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Filter className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-1 text-sm font-medium">Nenhuma segmentação criada</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Agrupe contatos por estágio, status, score e mais. Comece criando a
            primeira.
          </p>
          <Button
            onClick={openCreate}
            disabled={!withinQuota}
            size="sm"
            className="mt-2 gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova segmentação
          </Button>
        </Card>
      )}

      {!isLocked && segments.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => {
            const filterCount = countActiveContactFilters(segment.filters)
            return (
              <Card key={segment.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{segment.name}</p>
                    {segment.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {segment.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Filter className="h-3 w-3" />
                    {filterCount}
                  </Badge>
                </div>

                <div className="mt-auto flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    {segment.createdByName ?? 'Sistema'}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(segment)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setToDelete(segment)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Excluir</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {dialogOpen && (
        <UpsertSegmentDialog
          key={editing?.id ?? 'new'}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          isScoreEnabled={isScoreEnabled}
          segment={editing}
        />
      )}

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir segmentação?</AlertDialogTitle>
            <AlertDialogDescription>
              A segmentação “{toDelete?.name}” será removida. Disparos passados
              que a usaram não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAction.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (toDelete) deleteAction.execute({ id: toDelete.id })
              }}
              disabled={deleteAction.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
