import Link from 'next/link'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { ATTENTION_CARD_LIMIT } from '@/_lib/lifecycle/dashboard-v2-constants'
import type { AttentionListDto } from '@/_data-access/dashboard-v2/shared/attention-types'
import { AttentionContactRow } from './attention-contact-row'

interface AttentionStagnantOpportunitiesCardProps {
  data: AttentionListDto
  orgSlug: string
}

export function AttentionStagnantOpportunitiesCard({
  data,
  orgSlug,
}: AttentionStagnantOpportunitiesCardProps) {
  const isEmpty = data.contacts.length === 0
  const hasMore = data.totalCount > ATTENTION_CARD_LIMIT

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-amber-500" />
            Oportunidades Estagnadas
          </span>
          <Badge variant="outline">{data.totalCount}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Clock className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade parada</p>
            <p className="text-xs text-muted-foreground">há mais de 14 dias</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {data.contacts.map((contact) => (
              <AttentionContactRow
                key={contact.contactId}
                contact={contact}
                href={`/org/${orgSlug}/contacts/${contact.contactId}`}
              />
            ))}
          </div>
        )}
      </CardContent>

      {hasMore && (
        <CardFooter className="pt-3">
          <Link
            href={`/org/${orgSlug}/contacts?lifecycleStage=OPPORTUNITY`}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todos ({data.totalCount}) →
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}
