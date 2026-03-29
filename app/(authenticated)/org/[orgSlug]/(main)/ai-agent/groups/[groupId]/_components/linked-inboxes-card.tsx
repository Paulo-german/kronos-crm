import Link from 'next/link'
import { InboxIcon, ExternalLinkIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import type { AgentGroupDetailDto } from '@/_data-access/agent-group/get-agent-group-by-id'

interface LinkedInboxesCardProps {
  inboxes: AgentGroupDetailDto['inboxes']
  orgSlug: string
}

// Rótulos legíveis para os canais de inbox
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  webchat: 'Webchat',
  email: 'E-mail',
}

function getChannelLabel(channel: string): string {
  return CHANNEL_LABELS[channel.toLowerCase()] ?? channel
}

export function LinkedInboxesCard({ inboxes, orgSlug }: LinkedInboxesCardProps) {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader>
        <CardTitle className="text-base">Inboxes vinculados</CardTitle>
        <CardDescription>
          Inboxes usando esta equipe de agentes. Para desvincular, acesse a configuração do inbox.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {inboxes.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed">
            <InboxIcon className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhum inbox vinculado a esta equipe ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {inboxes.map((inbox) => (
              <div
                key={inbox.id}
                className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <InboxIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inbox.name}</p>
                    <p className="text-xs text-muted-foreground">{getChannelLabel(inbox.channel)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={inbox.isActive ? 'default' : 'secondary'} className="text-xs">
                    {inbox.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Link
                    href={`/org/${orgSlug}/settings/inboxes/${inbox.id}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Configurar inbox"
                  >
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
