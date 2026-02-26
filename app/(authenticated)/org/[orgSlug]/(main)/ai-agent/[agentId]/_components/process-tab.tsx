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
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { reorderSteps } from '@/_actions/agent/reorder-steps'
import SortableStepCard from './sortable-step-card'
import UpsertStepDialog from './upsert-step-dialog'
import type { AgentDetailDto, AgentStepDto } from '@/_data-access/agent/get-agent-by-id'

interface ProcessTabProps {
  agent: AgentDetailDto
  canManage: boolean
}

const ProcessTab = ({ agent, canManage }: ProcessTabProps) => {
  const dndContextId = useId()
  const [isMounted, setIsMounted] = useState(false)
  const [steps, setSteps] = useState<AgentStepDto[]>(agent.steps)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // SSR guard: evita hydration mismatch do DndContext (padrão da codebase em settings-client.tsx)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Sincroniza estado local com props do servidor (server revalidation após create/delete/reorder)
  useEffect(() => {
    setSteps(agent.steps)
  }, [agent.steps])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { execute: executeReorder } = useAction(reorderSteps, {
    onSuccess: () => {
      toast.success('Ordem das etapas atualizada!')
    },
    onError: ({ error }) => {
      setSteps(agent.steps)
      toast.error(error.serverError || 'Erro ao reordenar etapas.')
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((step) => step.id === active.id)
      const newIndex = steps.findIndex((step) => step.id === over.id)
      const newOrder = arrayMove(steps, oldIndex, newIndex)

      setSteps(newOrder)

      executeReorder({
        agentId: agent.id,
        stepIds: newOrder.map((step) => step.id),
      })
    }
  }

  const stepsList = (
    <div className="space-y-2">
      {steps.map((step) => (
        <SortableStepCard
          key={step.id}
          step={step}
          agentId={agent.id}
          canManage={canManage}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Etapas do Processo</h3>
        <p className="text-sm text-muted-foreground">
          Defina a sequência de etapas que o agente segue durante a conversa.
          Arraste para reordenar.
        </p>
      </div>

      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma etapa configurada. Adicione etapas para guiar o comportamento
            do agente.
          </p>
        </div>
      ) : isMounted ? (
        <DndContext
          id={dndContextId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((step) => step.id)}
            strategy={verticalListSortingStrategy}
          >
            {stepsList}
          </SortableContext>
        </DndContext>
      ) : (
        stepsList
      )}

      {canManage && (
        <>
          <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Etapa
          </Button>

          <UpsertStepDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            agentId={agent.id}
          />
        </>
      )}
    </div>
  )
}

export default ProcessTab
