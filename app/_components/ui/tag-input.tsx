'use client'

import { useState, useRef, type KeyboardEvent } from 'react'
import { XIcon } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Input } from '@/_components/ui/input'
import { cn } from '@/_lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TagInput({ value, onChange, placeholder, disabled, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string) => {
    const tag = raw.trim()
    if (!tag || value.includes(tag)) return
    onChange([...value, tag])
    setInputValue('')
  }

  const removeTag = (index: number) => {
    onChange(value.filter((_tag, tagIndex) => tagIndex !== index))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(inputValue)
      return
    }

    // Backspace em input vazio remove o último chip
    if (event.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  const handleBlur = () => {
    if (!inputValue.trim()) return
    // Ao colar lista separada por vírgula, divide em chips individuais
    const parts = inputValue.split(',')
    const newTags = parts.map((part) => part.trim()).filter((tag) => tag && !value.includes(tag))
    if (newTags.length > 0) onChange([...value, ...newTags])
    setInputValue('')
  }

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, index) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                removeTag(index)
              }}
              className="ml-0.5 rounded-full opacity-60 transition-opacity hover:opacity-100"
              aria-label={`Remover ${tag}`}
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="h-auto min-w-[120px] flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  )
}
