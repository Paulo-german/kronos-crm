'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

interface InboxOption {
  id: string
  name: string
  channel: string
}

interface InboxSelectorProps {
  inboxOptions: InboxOption[]
  selectedInboxId: string | null
  onSelect: (inboxId: string | null) => void
  orgSlug: string
}

const channelLabels: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEB_CHAT: 'Web Chat',
}

export function InboxSelector({
  inboxOptions,
  selectedInboxId,
  onSelect,
  orgSlug,
}: InboxSelectorProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
      <Select
        value={selectedInboxId ?? 'all'}
        onValueChange={(value) => onSelect(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Todas as caixas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as caixas de entrada</SelectItem>
          {inboxOptions.map((inbox) => (
            <SelectItem key={inbox.id} value={inbox.id}>
              {inbox.name} ({channelLabels[inbox.channel] ?? inbox.channel})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href={`/org/${orgSlug}/settings/inboxes`}>
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Gerenciar caixas de entrada</TooltipContent>
      </Tooltip>
    </div>
  )
}
