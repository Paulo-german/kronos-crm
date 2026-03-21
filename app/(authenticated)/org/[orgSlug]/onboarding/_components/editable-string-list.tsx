'use client'

import { useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'

interface EditableStringListProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  maxItems?: number
  addLabel?: string
}

export function EditableStringList({
  value,
  onChange,
  placeholder = 'Adicionar item...',
  maxItems,
  addLabel = 'Adicionar',
}: EditableStringListProps) {
  const handleChange = useCallback(
    (index: number, newValue: string) => {
      const updated = [...value]
      updated[index] = newValue
      onChange(updated)
    },
    [value, onChange],
  )

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, itemIndex) => itemIndex !== index))
    },
    [value, onChange],
  )

  const handleAdd = useCallback(() => {
    if (maxItems && value.length >= maxItems) return
    onChange([...value, ''])
  }, [value, onChange, maxItems])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleAdd()
      }
      if (event.key === 'Backspace' && value[index] === '' && value.length > 1) {
        event.preventDefault()
        handleRemove(index)
      }
    },
    [handleAdd, handleRemove, value],
  )

  const isAtMax = maxItems !== undefined && value.length >= maxItems

  return (
    <div className="flex flex-col gap-2">
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            placeholder={placeholder}
            className="h-9 flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(index)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}

      {!isAtMax && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="w-fit gap-1.5"
        >
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      )}

      {isAtMax && (
        <p className="text-xs text-muted-foreground">
          Máximo de {maxItems} itens atingido.
        </p>
      )}
    </div>
  )
}
