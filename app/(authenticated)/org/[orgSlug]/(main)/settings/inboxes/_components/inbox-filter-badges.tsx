'use client'

import { X } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import type { InboxFilters } from '../_lib/inbox-filters'
import {
  CONNECTION_STATUS_OPTIONS,
  PROVIDER_OPTIONS,
  CHANNEL_OPTIONS,
} from '../_lib/inbox-filters'

interface InboxFilterBadgesProps {
  filters: InboxFilters
  onFiltersChange: (filters: Partial<InboxFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function InboxFilterBadges({
  filters,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters,
}: InboxFilterBadgesProps) {
  if (!hasActiveFilters) return null

  const getConnectionStatusLabel = (value: string) =>
    CONNECTION_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value

  const getProviderLabel = (value: string) =>
    PROVIDER_OPTIONS.find((o) => o.value === value)?.label ?? value

  const getChannelLabel = (value: string) =>
    CHANNEL_OPTIONS.find((o) => o.value === value)?.label ?? value

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.connectionStatus.map((status) => (
        <Badge
          key={status}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Status: {getConnectionStatusLabel(status)}
          <button
            onClick={() =>
              onFiltersChange({
                connectionStatus: filters.connectionStatus.filter(
                  (s) => s !== status,
                ),
              })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.provider.map((provider) => (
        <Badge
          key={provider}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Provedor: {getProviderLabel(provider)}
          <button
            onClick={() =>
              onFiltersChange({
                provider: filters.provider.filter((p) => p !== provider),
              })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {filters.channel.map((channel) => (
        <Badge
          key={channel}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Canal: {getChannelLabel(channel)}
          <button
            onClick={() =>
              onFiltersChange({
                channel: filters.channel.filter((c) => c !== channel),
              })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Limpar todos
      </Button>
    </div>
  )
}
