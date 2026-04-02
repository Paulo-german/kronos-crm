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
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Clock, Loader2, Pencil, Trash2 } from 'lucide-react'

import { SortableStageRow } from './sortable-stage-row'
import { AddStageButton } from './add-stage-button'
import { DeleteStageDialog } from './delete-stage-dialog'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { reorderStages } from '@/_actions/pipeline/reorder-stages'
import { deleteStage } from '@/_actions/pipeline/delete-stage'
import { toggleIdleDays } from '@/_actions/pipeline/toggle-idle-days'
import { updatePipeline } from '@/_actions/pipeline/update-pipeline'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/_components/ui/card'

import type {
  PipelineWithStagesDto,
  StageDto,
} from '@/_data-access/pipeline/get-user-pipeline'

interface PipelineDetailClientProps {
  pipeline: PipelineWithStagesDto
}

export function PipelineDetailClient({ pipeline }: PipelineDetailClientProps) {
  // ID estável para evitar hydration mismatch
  const dndContextId = useId()
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // --- Estado de edição do nome do pipeline ---
  const [isEditingName, setIsEditingName] = useState(false)
  const [pipelineName, setPipelineName] = useState(pipeline.name)

  // --- Estado local das etapas (optimistic) ---
  const [stages, setStages] = useState<StageDto[]>(pipeline.stages)
  const [prevStages, setPrevStages] = useState<StageDto[]>(pipeline.stages)

  // Sincroniza quando props mudam após router.refresh()
  if (pipeline.stages !== prevStages) {
    setPrevStages(pipeline.stages)
    setStages(pipeline.stages)
  }

  // --- Idle days toggle ---
  const [idleDaysEnabled, setIdleDaysEnabled] = useState(pipeline.showIdleDays)

  // --- Etapa alvo para exclusão ---
  const [deleteTarget, setDeleteTarget] = useState<StageDto | null>(null)

  // --- Sensors do DnD ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // --- Actions ---
  const { execute: executeUpdateName, isPending: isUpdatingName } = useAction(
    updatePipeline,
    {
      onSuccess: () => {
        toast.success('Nome do funil atualizado!')
        setIsEditingName(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar nome do funil.')
      },
    },
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

  const { execute: executeToggleIdleDays } = useAction(toggleIdleDays, {
    onSuccess: () => {
      toast.success('Configuração atualizada!')
    },
    onError: ({ error }) => {
      setIdleDaysEnabled((prev) => !prev)
      toast.error(error.serverError || 'Erro ao atualizar configuração.')
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

  // --- Handlers ---
  const handleSaveName = () => {
    if (!pipelineName.trim() || pipelineName === pipeline.name) {
      setIsEditingName(false)
      setPipelineName(pipeline.name)
      return
    }
    executeUpdateName({ pipelineId: pipeline.id, name: pipelineName })
  }

  const handleCancelNameEdit = () => {
    setPipelineName(pipeline.name)
    setIsEditingName(false)
  }

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
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna esquerda: Configurações */}
        <div className="space-y-6">
          {/* Card: Nome do funil */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nome do funil</CardTitle>
              <CardDescription>
                Altere o nome de exibição deste funil de vendas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') handleCancelNameEdit()
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={isUpdatingName || !pipelineName.trim()}
                  >
                    {isUpdatingName && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelNameEdit}
                    disabled={isUpdatingName}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-medium">{pipeline.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Configurações de exibição */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exibição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label
                      htmlFor="idle-days-toggle"
                      className="text-sm font-medium"
                    >
                      Dias sem atividade
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Mostra nos cards quantos dias a negociação está parada
                    </p>
                  </div>
                </div>
                <Switch
                  id="idle-days-toggle"
                  checked={idleDaysEnabled}
                  onCheckedChange={(checked) => {
                    setIdleDaysEnabled(checked)
                    executeToggleIdleDays({
                      pipelineId: pipeline.id,
                      showIdleDays: checked,
                    })
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita: Etapas do funil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Etapas do funil</CardTitle>
            <CardDescription>
              Arraste para reordenar as etapas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
                        onDelete={(targetStage) => setDeleteTarget(targetStage)}
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
                    onDelete={(targetStage) => setDeleteTarget(targetStage)}
                  />
                ))}
              </div>
            )}

            <AddStageButton pipelineId={pipeline.id} />
          </CardContent>
        </Card>
      </div>

      {/* Dialog de exclusão simples (etapa sem deals) */}
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

      {/* Dialog de exclusão com migração (etapa com deals) */}
      {deleteTarget && deleteTarget.dealCount > 0 && (
        <DeleteStageDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          stage={deleteTarget}
          availableStages={stages.filter(
            (stage) => stage.id !== deleteTarget.id,
          )}
        />
      )}
    </>
  )
}
