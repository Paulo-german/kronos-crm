'use client'

import { Search } from 'lucide-react'
import { Input } from '@/_components/ui/input'

interface KanbanSearchProps {
  value: string
  onChange: (value: string) => void
}

export function KanbanSearch({ value, onChange }: KanbanSearchProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Buscar deals..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}
