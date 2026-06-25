'use client'

import MetaConnectionCard from '@/(authenticated)/org/[orgSlug]/(inbox)/inbox/settings/inboxes/[inboxId]/_components/meta-connection-card'
import ZApiConnectionCard from '@/(authenticated)/org/[orgSlug]/(inbox)/inbox/settings/inboxes/[inboxId]/_components/zapi-connection-card'
import EvolutionSelfHostedCard from '@/(authenticated)/org/[orgSlug]/(inbox)/inbox/settings/inboxes/[inboxId]/_components/evolution-js-self-hosted-card'
import EvolutionGoCard from '@/(authenticated)/org/[orgSlug]/(inbox)/inbox/settings/inboxes/[inboxId]/_components/evolution-go-card'

interface ChannelConnectionProps {
  inbox: {
    id: string
    connectionType: string
    metaPhoneNumberId: string | null
    metaPhoneDisplay: string | null
    metaWabaId: string | null
    zapiInstanceId: string | null
    evolutionApiUrl: string | null
    evolutionInstanceName: string | null
    evolutionApiKeyMasked: string | null
    hasEvolutionWebhookSecret: boolean
  }
  canManage: boolean
}

/**
 * Reaproveita os cards de conexão do Inbox na área de Canais do Prospection.
 * Suporta todos os provedores que disparam: Meta Cloud, Z-API e Evolution
 * self-hosted (API / Go). connectionStats fica null — estatísticas de conversas
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

  if (inbox.connectionType === 'EVOLUTION_GO') {
    return (
      <EvolutionGoCard
        inboxId={inbox.id}
        canManage={canManage}
        savedApiUrl={inbox.evolutionApiUrl}
        savedInstanceName={inbox.evolutionInstanceName}
        savedApiTokenMasked={inbox.evolutionApiKeyMasked}
        hasWebhookSecret={inbox.hasEvolutionWebhookSecret}
      />
    )
  }

  return (
    <EvolutionSelfHostedCard
      inboxId={inbox.id}
      canManage={canManage}
      savedApiUrl={inbox.evolutionApiUrl}
      savedInstanceName={inbox.evolutionInstanceName}
      savedApiKeyMasked={inbox.evolutionApiKeyMasked}
      hasWebhookSecret={inbox.hasEvolutionWebhookSecret}
    />
  )
}
