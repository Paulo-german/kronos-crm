import Link from 'next/link'
import type { ConnectionType } from '@prisma/client'
import { CheckCircle2, MessageCircle, Plus } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import { getConnectionLabel } from '../../_lib/broadcast-labels'
import { CreateChannelDialog } from './create-channel-dialog'

interface ChannelItem {
  id: string
  name: string
  connectionType: string
  evolutionConnected: boolean
  metaPhoneNumberId: string | null
  zapiInstanceId: string | null
}

interface ChannelsListProps {
  channels: ChannelItem[]
  orgSlug: string
  withinQuota: boolean
}

const isChannelConnected = (channel: ChannelItem) => {
  if (channel.connectionType === 'META_CLOUD')
    return Boolean(channel.metaPhoneNumberId)
  if (channel.connectionType === 'Z_API') return Boolean(channel.zapiInstanceId)
  return channel.evolutionConnected
}

export function ChannelsList({
  channels,
  orgSlug,
  withinQuota,
}: ChannelsListProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-1 text-sm font-medium">Nenhum canal conectado</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Conecte um número de WhatsApp (Meta Cloud, Z-API ou Evolution
          self-hosted) para começar a disparar suas campanhas.
        </p>
        <CreateChannelDialog
          orgSlug={orgSlug}
          withinQuota={withinQuota}
          trigger={
            <Button className="mt-2" size="sm">
              <Plus className="size-4" />
              Conectar canal
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {channels.map((channel) => {
        const connected = isChannelConnected(channel)
        return (
          <Link
            key={channel.id}
            href={`/org/${orgSlug}/prospection/channels/${channel.id}`}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="transition-colors hover:border-border">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{channel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getConnectionLabel(
                      channel.connectionType as ConnectionType,
                    )}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    connected
                      ? 'shrink-0 border-kronos-green/20 bg-kronos-green/10 text-kronos-green'
                      : 'shrink-0 border-border bg-muted text-muted-foreground'
                  }
                >
                  {connected && <CheckCircle2 className="mr-1 size-3" />}
                  {connected ? 'Conectado' : 'Pendente'}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
