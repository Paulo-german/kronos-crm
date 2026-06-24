'use client'

import MetaConnectionCard from '@/(authenticated)/org/[orgSlug]/(inbox)/inbox/settings/inboxes/[inboxId]/_components/meta-connection-card'
import ZApiConnectionCard from '@/(authenticated)/org/[orgSlug]/(inbox)/inbox/settings/inboxes/[inboxId]/_components/zapi-connection-card'

interface ChannelConnectionProps {
  inbox: {
    id: string
    connectionType: string
    metaPhoneNumberId: string | null
    metaPhoneDisplay: string | null
    metaWabaId: string | null
    zapiInstanceId: string | null
  }
  canManage: boolean
}

/**
 * Reaproveita os cards de conexão do Inbox (Meta Cloud / Z-API) na área de
 * Canais do Prospection. connectionStats fica null: estatísticas de conversas
 * são do atendimento (Inbox), não fazem sentido aqui.
 */
export function ChannelConnection({
  inbox,
  canManage,
}: ChannelConnectionProps) {
  if (inbox.connectionType === 'META_CLOUD') {
    return (
      <MetaConnectionCard
        inboxId={inbox.id}
        canManage={canManage}
        isConnected={Boolean(inbox.metaPhoneNumberId)}
        metaPhoneDisplay={inbox.metaPhoneDisplay}
        metaWabaId={inbox.metaWabaId}
        connectionStats={null}
      />
    )
  }

  if (inbox.connectionType === 'Z_API') {
    return (
      <ZApiConnectionCard
        inboxId={inbox.id}
        canManage={canManage}
        isConnected={Boolean(inbox.zapiInstanceId)}
        zapiPhone={null}
        connectionStats={null}
      />
    )
  }

  return null
}
