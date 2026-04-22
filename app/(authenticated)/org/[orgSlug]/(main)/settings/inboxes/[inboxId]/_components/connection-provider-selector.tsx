'use client'

import { useState } from 'react'
import { QrCode, Phone, Plug, Server, ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import InboxConnectionCard from './inbox-connection-card'
import MetaConnectionCard from './meta-connection-card'
import ZApiConnectionCard from './zapi-connection-card'
import EvolutionSelfHostedCard from './evolution-self-hosted-card'
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import type { EvolutionInstanceInfo } from '@/_lib/evolution/types-instance'

type ProviderSelection =
  | 'evolution'
  | 'meta_cloud'
  | 'z_api'
  | 'evolution_self_hosted'
  | null

interface ConnectionProviderSelectorProps {
  inboxId: string
  canManage: boolean
  connectionStats: AgentConnectionStats | null
  instanceInfo: EvolutionInstanceInfo | null
}

/**
 * Seletor de provider de conexao WhatsApp.
 *
 * Quando nenhuma conexao esta ativa, exibe quatro cards para o usuario escolher:
 * - WhatsApp (QR Code) — conexao via instancia gerenciada pela Kronos
 * - WhatsApp Oficial (Meta) — conexao via Embedded Signup da Meta
 * - Z-API — conexao via Instance ID e Token
 * - Evolution API (self-hosted) — conexao via instancia propria do usuario
 *
 * Apos a selecao, renderiza o sub-fluxo correspondente.
 */
const ConnectionProviderSelector = ({
  inboxId,
  canManage,
  connectionStats,
  instanceInfo,
}: ConnectionProviderSelectorProps) => {
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderSelection>(null)

  // Sub-fluxo: WhatsApp via QR Code (gerenciado pela Kronos)
  if (selectedProvider === 'evolution') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setSelectedProvider(null)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para selecao
        </Button>
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

  // Sub-fluxo: Meta Cloud API
  if (selectedProvider === 'meta_cloud') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setSelectedProvider(null)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para selecao
        </Button>
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

  // Sub-fluxo: Z-API
  if (selectedProvider === 'z_api') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setSelectedProvider(null)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para selecao
        </Button>
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

  // Sub-fluxo: Evolution API self-hosted
  if (selectedProvider === 'evolution_self_hosted') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setSelectedProvider(null)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para selecao
        </Button>
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

  // Seletor inicial — quatro cards
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm font-medium">Escolha o tipo de conexao</p>
        <p className="text-xs text-muted-foreground">
          Selecione como deseja conectar o WhatsApp a esta caixa de entrada.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Card WhatsApp — QR Code gerenciado */}
        <Card className="cursor-pointer border-border/50 bg-secondary/20 transition-colors hover:border-border hover:bg-secondary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <QrCode className="h-5 w-5" />
              WhatsApp
            </CardTitle>
            <CardDescription>
              Conecte escaneando o QR Code com qualquer número WhatsApp. Ideal
              para números pessoais ou de negócio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Qualquer número WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Conexão via QR Code no celular
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Sem aprovação da Meta necessária
              </li>
            </ul>
            {canManage && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setSelectedProvider('evolution')}
              >
                Conectar via QR Code
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Card Meta Cloud API — API Oficial */}
        <Card className="cursor-pointer border-border/50 bg-secondary/20 transition-colors hover:border-border hover:bg-secondary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Phone className="h-5 w-5" />
              WhatsApp Oficial (Meta)
            </CardTitle>
            <CardDescription>
              Conecte via API Oficial do WhatsApp Business (Meta Cloud API).
              Requer número verificado pela Meta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Número verificado pelo Meta
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                API oficial e estável
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Sem risco de bloqueio de conta
              </li>
            </ul>
            {canManage && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setSelectedProvider('meta_cloud')}
              >
                Conectar via Meta
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Card Z-API */}
        <Card className="cursor-pointer border-border/50 bg-secondary/20 transition-colors hover:border-border hover:bg-secondary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Plug className="h-5 w-5" />
              Z-API WhatsApp
            </CardTitle>
            <CardDescription>
              Conecte via Z-API usando Instance ID e Token. Ideal para quem já
              utiliza a plataforma Z-API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Qualquer número WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Conexão via QR Code ou código
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Gerenciado pela plataforma Z-API
              </li>
            </ul>
            {canManage && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setSelectedProvider('z_api')}
              >
                Conectar via Z-API
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Card Evolution API — self-hosted */}
        <Card className="cursor-pointer border-border/50 bg-secondary/20 transition-colors hover:border-border hover:bg-secondary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Server className="h-5 w-5" />
              Evolution API
            </CardTitle>
            <CardDescription>
              Conecte usando sua própria instância Evolution API (self-hosted).
              Para usuários avançados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Instância própria self-hosted
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Controle total sobre a infraestrutura
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Requer servidor Evolution API ativo
              </li>
            </ul>
            {canManage && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setSelectedProvider('evolution_self_hosted')}
              >
                Configurar Evolution API
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConnectionProviderSelector
