'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import type { Control } from 'react-hook-form'
import type { z } from 'zod'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Switch } from '@/_components/ui/switch'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import type { captureFormBaseSchema } from '@/_actions/capture-form/schema'

// z.input<> espelha o shape de entrada (campos com .default() ficam opcionais)
type FormValues = z.input<typeof captureFormBaseSchema>

interface CaptureFormFieldRowProps {
  fieldDefinitionId: string
  fieldLabel: string
  index: number
  control: Control<FormValues>
  onRemove: () => void
}

export const CaptureFormFieldRow = ({
  fieldDefinitionId,
  fieldLabel,
  index,
  control,
  onRemove,
}: CaptureFormFieldRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldDefinitionId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-3 rounded-md border bg-card p-3',
        isDragging && 'shadow-lg ring-2 ring-primary',
      )}
    >
      {/* Handle de drag */}
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Conteúdo do campo */}
      <div className="flex flex-1 flex-col gap-3">
        {/* Label do campo + toggle required */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">{fieldLabel}</span>

          <FormField
            control={control}
            name={`customFields.${index}.required`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Switch
                    checked={field.value as boolean}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-xs text-muted-foreground">
                  Obrigatório
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Label override */}
        <FormField
          control={control}
          name={`customFields.${index}.labelOverride`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder={`Label personalizado (padrão: "${fieldLabel}")`}
                  value={(field.value as string | null | undefined) ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value || null)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Botão remover */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
