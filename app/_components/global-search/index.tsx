'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { GlobalSearchDialog } from './global-search-dialog'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="hidden h-8 min-w-96 justify-between gap-2 text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span>Buscar contatos, empresas e negociações</span>
        <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
