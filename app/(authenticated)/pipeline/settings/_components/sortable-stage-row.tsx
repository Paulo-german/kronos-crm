'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { GripVertical, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { deleteStage } from '@/_actions/pipeline/delete-stage'
import { updateStage } from '@/_actions/pipeline/update-stage'
import { DeleteStageDialog } from './delete-stage-dialog'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface SortableStageRowProps {
  stage: StageDto
  allStages: StageDto[]
}

export function SortableStageRow({ stage, allStages }: SortableStageRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(stage.name)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateStage,
    {
      onSuccess: () => {
        toast.success('Etapa atualizada!')
        setIsEditing(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar etapa.')
      },
    },
  )

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteStage,
    {
      onSuccess: () => {
        toast.success('Etapa excluída!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir etapa.')
      },
    },
  )

  const handleSave = () => {
    executeUpdate({ id: stage.id, name })
  }

  const handleCancel = () => {
    setName(stage.name)

    setIsEditing(false)
  }

  const handleDelete = () => {
    // Se tem deals, abre modal para migração
    if (stage.dealCount > 0) {
      setShowDeleteDialog(true)
      return
    }

    // Se não tem deals, confirma e deleta diretamente
    if (confirm('Tem certeza que deseja excluir esta etapa?')) {
      executeDelete({ id: stage.id })
    }
  }

  // Etapas disponíveis para migração (excluindo a própria etapa)
  const availableStages = allStages.filter((s) => s.id !== stage.id)

  const isPending = isUpdating || isDeleting

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Name */}
      {isEditing ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
      ) : (
        <span className="flex-1 font-medium">{stage.name}</span>
      )}

      {/* Deal count */}
      <span className="text-sm text-muted-foreground">
        {stage.dealCount} deals
      </span>

      {/* Actions */}
      {isEditing ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={isPending}
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isPending}
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Dialog de Reatribuição */}
      <DeleteStageDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        stage={stage}
        availableStages={availableStages}
      />
    </div>
  )
}
