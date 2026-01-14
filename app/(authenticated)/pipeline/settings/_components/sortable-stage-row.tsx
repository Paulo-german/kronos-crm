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
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface SortableStageRowProps {
  stage: StageDto
  isWon: boolean
  isLost: boolean
}

export function SortableStageRow({
  stage,
  isWon,
  isLost,
}: SortableStageRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(stage.name)
  const [color, setColor] = useState(stage.color || '#6b7280')

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
    executeUpdate({ id: stage.id, name, color })
  }

  const handleCancel = () => {
    setName(stage.name)
    setColor(stage.color || '#6b7280')
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta etapa?')) {
      executeDelete({ id: stage.id })
    }
  }

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

      {/* Color picker */}
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        disabled={!isEditing}
        className="h-8 w-8 cursor-pointer rounded border-0"
      />

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

      {/* Special badges */}
      {isWon && (
        <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-600">
          Ganho
        </span>
      )}
      {isLost && (
        <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-600">
          Perdido
        </span>
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
    </div>
  )
}
