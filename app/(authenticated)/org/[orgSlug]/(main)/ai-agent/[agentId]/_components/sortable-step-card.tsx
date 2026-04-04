'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertStepDialog from './upsert-step-dialog'
import { deleteStep } from '@/_actions/agent/delete-step'
import { TOOL_OPTIONS } from './constants'
import type { AgentStepDto } from '@/_data-access/agent/get-agent-by-id'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'

interface SortableStepCardProps {
  step: AgentStepDto
  agentId: string
  canManage: boolean
  pipelineStages: PipelineStageOption[]
}

const SortableStepCard = ({
  step,
  agentId,
  canManage,
  pipelineStages,
}: SortableStepCardProps) => {
  const actions = step.actions ?? []
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteStep,
    {
      onSuccess: () => {
        toast.success('Etapa excluída!')
        setIsDeleteOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir etapa.')
      },
    },
  )

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-start gap-3 rounded-md border border-border/50 bg-card p-4 ${
          isDragging ? 'shadow-lg ring-2 ring-primary' : ''
        }`}
      >
        {/* Drag handle */}
        {canManage && (
          <button
            type="button"
            className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {step.order + 1}
            </Badge>
            <span className="font-medium">{step.name}</span>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {step.objective}
          </p>
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {actions.map((action, index) => {
                const toolLabel = TOOL_OPTIONS.find((tool) => tool.value === action.type)?.label ?? action.type
                return (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {toolLabel}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <UpsertStepDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        agentId={agentId}
        defaultValues={step}
        pipelineStages={pipelineStages}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir etapa?"
        description={
          <p>
            Você está prestes a remover a etapa{' '}
            <span className="font-bold text-foreground">{step.name}</span>.
            Esta ação não pode ser desfeita.
          </p>
        }
        icon={<Trash2 />}
        variant="destructive"
        onConfirm={() => executeDelete({ id: step.id, agentId })}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />
    </>
  )
}

export default SortableStepCard
