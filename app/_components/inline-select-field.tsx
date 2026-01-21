'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { cn } from '@/_lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface InlineSelectFieldProps {
  value: string | null
  options: SelectOption[]
  onSave: (newValue: string | null) => void
  isPending?: boolean
  placeholder?: string
  emptyLabel?: string
  className?: string
  displayClassName?: string
}

export const InlineSelectField = ({
  value,
  options,
  onSave,
  isPending = false,
  placeholder = 'Selecionar',
  emptyLabel = 'Nenhum selecionado',
  className,
  displayClassName,
}: InlineSelectFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const startEdit = () => {
    setEditValue(value || 'empty')
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditValue('')
  }

  const saveEdit = () => {
    const finalValue = editValue === 'empty' ? null : editValue
    onSave(finalValue)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={cn('space-y-3', className)}>
        <Select
          value={editValue}
          onValueChange={setEditValue}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="empty">{emptyLabel}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button size="sm" onClick={saveEdit} disabled={isPending}>
            <Check className="mr-2 h-4 w-4" />
            Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={cancelEdit}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        {selectedOption ? (
          <p className={cn('font-medium', displayClassName)}>
            {selectedOption.label}
          </p>
        ) : (
          <p className="italic text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
      <Button size="icon" variant="ghost" onClick={startEdit}>
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
