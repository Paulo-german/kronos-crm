'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import InboxConnectionCard from './inbox-connection-card'
import MetaConnectionCard from './meta-connection-card'
import ZApiConnectionCard from './zapi-connection-card'
import EvolutionSelfHostedCard from './evolution-js-self-hosted-card'
import EvolutionGoCard from './evolution-go-card'
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import type { EvolutionInstanceInfo } from '@/_lib/evolution-js/types-instance'

type ProviderSelection =
  | 'evolution'
  | 'meta_cloud'
  | 'z_api'
  | 'evolution_self_hosted'
  | 'evolution_go'
  | null

interface ConnectionProviderSelectorProps {
  inboxId: string
  canManage: boolean
  connectionStats: AgentConnectionStats | null
  instanceInfo: EvolutionInstanceInfo | null
}

interface ProviderCardProps {
  logo: string
  logoAlt: string
  name: string
  badge?: string
  onClick: () => void
  disabled?: boolean
}

const ProviderCard = ({ logo, logoAlt, name, badge, onClick, disabled }: ProviderCardProps) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background px-4 py-3.5 text-left transition-colors hover:border-border hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <div className="relative h-9 w-9 shrink-0">
      <Image
        src={logo}
        alt={logoAlt}
        fill
        className="rounded-lg object-contain"
        sizes="36px"
      />
      {badge && (
        <span className="absolute -bottom-1 -right-1.5 rounded bg-cyan-500 px-1 py-px text-[9px] font-bold leading-3 text-white">
          {badge}
        </span>
      )}
    </div>
    <span className="text-sm font-medium">{name}</span>
  </button>
)

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="ghost" size="sm" className="w-fit" onClick={onClick}>
    <ArrowLeft className="mr-2 h-4 w-4" />
    Voltar para seleção
  </Button>
)

const ConnectionProviderSelector = ({
  inboxId,
  canManage,
  connectionStats,
  instanceInfo,
}: ConnectionProviderSelectorProps) => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderSelection>(null)

  if (selectedProvider === 'evolution') {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setSelectedProvider(null)} />
        <InboxConnectionCard
          inboxId={inboxId}
          canManage={canManage}
          connectionStats={connectionStats}
          instanceInfo={instanceInfo}
          hasInstance={false}
          instanceName={null}
          initialConnected={false}
          isSelfHosted={false}
        />
      </div>
    )
  }

  if (selectedProvider === 'meta_cloud') {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setSelectedProvider(null)} />
        <MetaConnectionCard
          inboxId={inboxId}
          canManage={canManage}
          isConnected={false}
          metaPhoneDisplay={null}
          metaWabaId={null}
          connectionStats={connectionStats}
        />
      </div>
    )
  }

  if (selectedProvider === 'z_api') {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setSelectedProvider(null)} />
        <ZApiConnectionCard
          inboxId={inboxId}
          canManage={canManage}
          isConnected={false}
          zapiPhone={null}
          connectionStats={connectionStats}
        />
      </div>
    )
  }

  if (selectedProvider === 'evolution_self_hosted') {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setSelectedProvider(null)} />
        <EvolutionSelfHostedCard
          inboxId={inboxId}
          canManage={canManage}
          savedApiUrl={null}
          savedInstanceName={null}
          savedApiKeyMasked={null}
          webhookSecret={null}
          onRemoved={() => setSelectedProvider(null)}
        />
      </div>
    )
  }

  if (selectedProvider === 'evolution_go') {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setSelectedProvider(null)} />
        <EvolutionGoCard
          inboxId={inboxId}
          canManage={canManage}
          savedApiUrl={null}
          savedInstanceName={null}
          savedApiTokenMasked={null}
          webhookSecret={null}
          onRemoved={() => setSelectedProvider(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Escolha o provedor de conexão</p>
        <p className="text-xs text-muted-foreground">
          Selecione como deseja conectar o WhatsApp a esta caixa de entrada.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ProviderCard
          logo="/images/providers/whatsapp-meta.svg"
          logoAlt="WhatsApp"
          name="WhatsApp (QR Code)"
          onClick={() => setSelectedProvider('evolution')}
          disabled={!canManage}
        />
        <ProviderCard
          logo="/images/providers/whatsapp-meta.svg"
          logoAlt="WhatsApp Oficial"
          name="WhatsApp Oficial (Meta)"
          onClick={() => setSelectedProvider('meta_cloud')}
          disabled={!canManage}
        />
        <ProviderCard
          logo="/images/providers/zapi.png"
          logoAlt="Z-API"
          name="Z-API"
          onClick={() => setSelectedProvider('z_api')}
          disabled={!canManage}
        />
        <ProviderCard
          logo="/images/providers/evolution-api.png"
          logoAlt="Evolution API"
          name="Evolution API"
          onClick={() => setSelectedProvider('evolution_self_hosted')}
          disabled={!canManage}
        />
        <ProviderCard
          logo="/images/providers/evolution-go.png"
          logoAlt="Evolution Go"
          name="Evolution Go"
          badge="Go"
          onClick={() => setSelectedProvider('evolution_go')}
          disabled={!canManage}
        />
      </div>
    </div>
  )
}

export default ConnectionProviderSelector
