'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/_components/ui/sheet'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import { Label } from '@/_components/ui/label'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { InboxFilters } from '../_lib/inbox-filters'
import {
  CONNECTION_STATUS_OPTIONS,
  PROVIDER_OPTIONS,
  CHANNEL_OPTIONS,
} from '../_lib/inbox-filters'

interface InboxFiltersSheetProps {
  filters: InboxFilters
  onFiltersChange: (filters: Partial<InboxFilters>) => void
  activeFilterCount: number
}

export function InboxFiltersSheet({
  filters,
  onFiltersChange,
  activeFilterCount,
}: InboxFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<InboxFilters>(filters)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalFilters(filters)
    }
    setIsOpen(open)
  }

  const handleConnectionStatusToggle = (
    value: 'connected' | 'disconnected',
  ) => {
    const current = localFilters.connectionStatus
    const next = current.includes(value)
      ? current.filter((s) => s !== value)
      : [...current, value]
    setLocalFilters({ ...localFilters, connectionStatus: next })
  }

  const handleProviderToggle = (value: string) => {
    const current = localFilters.provider
    const next = current.includes(value)
      ? current.filter((p) => p !== value)
      : [...current, value]
    setLocalFilters({ ...localFilters, provider: next })
  }

  const handleChannelToggle = (value: string) => {
    const current = localFilters.channel
    const next = current.includes(value)
      ? current.filter((c) => c !== value)
      : [...current, value]
    setLocalFilters({ ...localFilters, channel: next })
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClearLocal = () => {
    setLocalFilters({ connectionStatus: [], provider: [], channel: [] })
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="soft" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 bg-primary/30 px-1.5 text-xs text-primary hover:bg-primary/30">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros de Caixas de Entrada</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto py-4">
          {/* Status de Conexão */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              Status de Conexão
            </Label>
            <div className="flex flex-wrap gap-2">
              {CONNECTION_STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    localFilters.connectionStatus.includes(option.value)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={localFilters.connectionStatus.includes(
                      option.value,
                    )}
                    onCheckedChange={() =>
                      handleConnectionStatusToggle(option.value)
                    }
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Provedor */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Provedor</Label>
            <div className="flex flex-wrap gap-2">
              {PROVIDER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    localFilters.provider.includes(option.value)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={localFilters.provider.includes(option.value)}
                    onCheckedChange={() => handleProviderToggle(option.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Canal */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Canal</Label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    localFilters.channel.includes(option.value)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={localFilters.channel.includes(option.value)}
                    onCheckedChange={() => handleChannelToggle(option.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handleClearLocal}
            className="flex-1"
          >
            Limpar
          </Button>
          <SheetClose asChild>
            <Button onClick={handleApplyFilters} className="flex-1">
              Aplicar Filtros
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
