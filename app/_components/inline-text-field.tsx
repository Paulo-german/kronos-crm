'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { cn } from '@/_lib/utils'

interface InlineTextFieldProps {
  value: string | null
  onSave: (newValue: string) => void
  isPending?: boolean
  placeholder?: string
  className?: string
  displayClassName?: string
  inputClassName?: string
}

export const InlineTextField = ({
  value,
  onSave,
  isPending = false,
  placeholder = 'Clique para editar',
  className,
  displayClassName,
  inputClassName,
}: InlineTextFieldProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setEditValue(value ?? '')
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditValue('')
  }

  const saveEdit = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // Auto-focus quando entra em modo de edição
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className={inputClassName}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={saveEdit}
          disabled={isPending}
        >
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" onClick={cancelEdit}>
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('group flex items-center gap-2', className)}>
      <span className={cn(displayClassName)}>
        {value || (
          <span className="italic text-muted-foreground">{placeholder}</span>
        )}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={startEdit}
      >
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  )
}
