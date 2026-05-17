import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import type { AttentionContactDto } from '@/_data-access/dashboard-v2/shared/attention-types'

interface AttentionContactRowProps {
  contact: AttentionContactDto
  href: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function AttentionContactRow({ contact, href }: AttentionContactRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={contact.contactAvatarUrl ?? undefined} alt={contact.contactName} />
        <AvatarFallback className="text-xs">{getInitials(contact.contactName)}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium">{contact.contactName}</p>
        {contact.secondaryMetric !== null && (
          <p className="truncate text-xs text-muted-foreground">{contact.secondaryMetric}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {contact.isScoreStale === true && (
          <Badge variant="outline" className="text-xs">
            Score desatualizado
          </Badge>
        )}
        <Badge variant={contact.primaryMetricVariant} className="text-xs">
          {contact.primaryMetric}
        </Badge>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  )
}
