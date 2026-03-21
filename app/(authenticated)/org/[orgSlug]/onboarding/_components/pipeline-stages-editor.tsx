'use client'

import { useState, useCallback, useEffect } from 'react'
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import type { ConfigBundle } from '@/_lib/onboarding/schemas/config-bundle'

type PipelineStage = ConfigBundle['pipelineStages'][number]

// Paleta de 12 cores pre-definidas para stages CRM
const STAGE_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#64748b', // Slate
  '#78716c', // Stone
]

interface SortableStageItemProps {
  stage: PipelineStage
  onNameChange: (name: string) => void
  onColorChange: (color: string) => void
  onRemove: () => void
  canRemove: boolean
}

function SortableStageItem({
  stage,
  onNameChange,
  onColorChange,
  onRemove,
  canRemove,
}: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(stage.position) })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border bg-background p-2"
    >
      {/* Handle de drag */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="size-4" />
      </button>

      {/* Seletor de cor */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="size-6 shrink-0 rounded border transition-transform hover:scale-110"
            style={{ backgroundColor: stage.color }}
            aria-label={`Cor do stage: ${stage.color}`}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-6 gap-1">
            {STAGE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="size-6 rounded border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: stage.color === color ? 'white' : 'transparent',
                  outline: stage.color === color ? `2px solid ${color}` : 'none',
                  outlineOffset: '1px',
                }}
                onClick={() => onColorChange(color)}
                aria-label={`Selecionar cor ${color}`}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Nome do stage */}
      <Input
        value={stage.name}
        onChange={(event) => onNameChange(event.target.value)}
        className="h-8 flex-1 border-transparent bg-transparent px-1 focus-visible:border-input focus-visible:bg-background"
        placeholder="Nome do stage..."
      />

      {/* Botao remover */}
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

interface PipelineStagesEditorProps {
  stages: PipelineStage[]
  onChange: (stages: PipelineStage[]) => void
}

export function PipelineStagesEditor({
  stages,
  onChange,
}: PipelineStagesEditorProps) {
  // SSR Guard: evita hydration mismatch com DndContext
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = stages.findIndex(
        (stage) => String(stage.position) === active.id,
      )
      const newIndex = stages.findIndex(
        (stage) => String(stage.position) === over.id,
      )

      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(stages, oldIndex, newIndex).map(
        (stage, index) => ({ ...stage, position: index }),
      )
      onChange(reordered)
    },
    [stages, onChange],
  )

  const handleNameChange = useCallback(
    (position: number, name: string) => {
      onChange(
        stages.map((stage) =>
          stage.position === position ? { ...stage, name } : stage,
        ),
      )
    },
    [stages, onChange],
  )

  const handleColorChange = useCallback(
    (position: number, color: string) => {
      onChange(
        stages.map((stage) =>
          stage.position === position ? { ...stage, color } : stage,
        ),
      )
    },
    [stages, onChange],
  )

  const handleRemove = useCallback(
    (position: number) => {
      const filtered = stages
        .filter((stage) => stage.position !== position)
        .map((stage, index) => ({ ...stage, position: index }))
      onChange(filtered)
    },
    [stages, onChange],
  )

  const handleAdd = useCallback(() => {
    if (stages.length >= 9) return
    const nextColor = STAGE_COLORS[stages.length % STAGE_COLORS.length]
    onChange([
      ...stages,
      {
        name: '',
        position: stages.length,
        color: nextColor,
      },
    ])
  }, [stages, onChange])

  // Fallback sem DnD para SSR
  if (!isMounted) {
    return (
      <div className="flex flex-col gap-2">
        {stages.map((stage) => (
          <div
            key={stage.position}
            className="flex items-center gap-2 rounded-lg border bg-background p-2"
          >
            <div
              className="size-6 shrink-0 rounded"
              style={{ backgroundColor: stage.color }}
            />
            <span className="flex-1 text-sm">{stage.name}</span>
          </div>
        ))}
      </div>
    )
  }

  const stageIds = stages.map((stage) => String(stage.position))

  return (
    <div className="flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
          {stages.map((stage) => (
            <SortableStageItem
              key={stage.position}
              stage={stage}
              onNameChange={(name) => handleNameChange(stage.position, name)}
              onColorChange={(color) => handleColorChange(stage.position, color)}
              onRemove={() => handleRemove(stage.position)}
              canRemove={stages.length > 4}
            />
          ))}
        </SortableContext>
      </DndContext>

      {stages.length < 9 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="w-fit gap-1.5"
        >
          <Plus className="size-3.5" />
          Adicionar stage
        </Button>
      )}
    </div>
  )
}
