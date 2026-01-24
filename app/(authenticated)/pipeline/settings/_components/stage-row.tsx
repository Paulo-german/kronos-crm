'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { GripVertical, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { deleteStage } from '@/_actions/pipeline/delete-stage'
import { updateStage } from '@/_actions/pipeline/update-stage'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface StageRowProps {
  stage: StageDto
  isWon: boolean
  isLost: boolean
}

export function StageRow({ stage, isWon, isLost }: StageRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(stage.name)

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
    if (confirm('Tem certeza que deseja excluir esta etapa?')) {
      executeDelete({ id: stage.id })
    }
  }

  const isPending = isUpdating || isDeleting

  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-3">
      {/* Drag handle */}
      <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />

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
