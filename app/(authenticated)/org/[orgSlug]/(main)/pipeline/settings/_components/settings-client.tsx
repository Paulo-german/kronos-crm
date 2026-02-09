'use client'

import { useState, useId, useEffect } from 'react'
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

import { SortableStageRow } from './sortable-stage-row'
import { AddStageButton } from './add-stage-button'
import { reorderStages } from '@/_actions/pipeline/reorder-stages'
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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Estado local para optimistic reordering
  const [stages, setStages] = useState<StageDto[]>(pipeline.stages)

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
                    allStages={stages}
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
                allStages={stages}
              />
            ))}
          </div>
        )}

        <AddStageButton pipelineId={pipeline.id} />
      </div>
    </div>
  )
}
