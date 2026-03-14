'use client'

import { useState, useId, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

import { SortableStageRow } from './sortable-stage-row'
import { AddStageButton } from '../../_components/add-stage-button'
import { DeleteStageDialog } from '../../_components/delete-stage-dialog'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { reorderStages } from '@/_actions/pipeline/reorder-stages'
import { deleteStage } from '@/_actions/pipeline/delete-stage'
import type {
  PipelineWithStagesDto,
  StageDto,
} from '@/_data-access/pipeline/get-user-pipeline'

interface SettingsClientProps {
  pipeline: PipelineWithStagesDto
}

export function SettingsClient({ pipeline }: SettingsClientProps) {
  // ID estável para evitar hydration mismatch
  const dndContextId = useId()
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Estado local para optimistic reordering — sincroniza quando props mudam (router.refresh)
  const [stages, setStages] = useState<StageDto[]>(pipeline.stages)
  const [prevStages, setPrevStages] = useState<StageDto[]>(pipeline.stages)

  // Etapa alvo para exclusão (null = nenhum dialog aberto)
  const [deleteTarget, setDeleteTarget] = useState<StageDto | null>(null)

  if (pipeline.stages !== prevStages) {
    setPrevStages(pipeline.stages)
    setStages(pipeline.stages)
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { execute: executeReorder } = useAction(reorderStages, {
    onSuccess: () => {
      toast.success('Ordem das etapas atualizada!')
    },
    onError: ({ error }) => {
      // Rollback para ordem original do servidor
      setStages(pipeline.stages)
      toast.error(error.serverError || 'Erro ao reordenar etapas.')
    },
  })

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteStage,
    {
      onSuccess: () => {
        toast.success('Etapa excluída!')
        setDeleteTarget(null)
        router.refresh()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir etapa.')
      },
    },
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex((item) => item.id === active.id)
      const newIndex = stages.findIndex((item) => item.id === over.id)

      const newOrder = arrayMove(stages, oldIndex, newIndex)

      // Atualiza UI imediatamente (optimistic)
      setStages(newOrder)

      // Persiste no servidor (fora do setState!)
      executeReorder({
        pipelineId: pipeline.id,
        stageIds: newOrder.map((stage) => stage.id),
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Stages list with drag and drop */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Etapas do Pipeline</h3>
        <p className="text-sm text-muted-foreground">
          Arraste para reordenar, clique no lápis para editar.
        </p>

        {isMounted ? (
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((stage) => stage.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {stages.map((stage) => (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}

                    onDelete={(stage) => setDeleteTarget(stage)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-2">
            {stages.map((stage) => (
              <SortableStageRow
                key={stage.id}
                stage={stage}
                onDelete={(stage) => setDeleteTarget(stage)}
              />
            ))}
          </div>
        )}

        <AddStageButton pipelineId={pipeline.id} />
      </div>

      {/* Dialog de exclusão simples (etapa sem deals) — renderizado fora do DndContext */}
      {deleteTarget && deleteTarget.dealCount === 0 && (
        <ConfirmationDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          variant="destructive"
          icon={<Trash2 className="h-6 w-6" />}
          title="Excluir etapa"
          description={
            <p>
              Tem certeza que deseja excluir a etapa{' '}
              <strong>{deleteTarget.name}</strong>? Esta ação não pode ser
              desfeita.
            </p>
          }
          confirmLabel="Excluir"
          isLoading={isDeleting}
          onConfirm={() => executeDelete({ id: deleteTarget.id })}
        />
      )}

      {/* Dialog de exclusão com migração (etapa com deals) — renderizado fora do DndContext */}
      {deleteTarget && deleteTarget.dealCount > 0 && (
        <DeleteStageDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          stage={deleteTarget}
          availableStages={stages.filter((s) => s.id !== deleteTarget.id)}
        />
      )}
    </div>
  )
}
