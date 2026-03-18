'use client'

import { useState } from 'react'
import { QrCode, Phone, ArrowLeft } from 'lucide-react'
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
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import type { EvolutionInstanceInfo } from '@/_lib/evolution/types-instance'

type ProviderSelection = 'evolution' | 'meta_cloud' | null

interface ConnectionProviderSelectorProps {
  inboxId: string
  canManage: boolean
  connectionStats: AgentConnectionStats | null
  instanceInfo: EvolutionInstanceInfo | null
}

/**
 * Seletor de provider de conexao WhatsApp.
 *
 * Quando nenhuma conexao esta ativa, exibe dois cards para o usuario escolher:
 * - Evolution (QR Code) — conexao via instancia Evolution API
 * - Meta Cloud API (API Oficial) — conexao via Embedded Signup da Meta
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

  // Sub-fluxo: Evolution (QR Code)
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

  // Seletor inicial — dois cards lado a lado
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm font-medium">Escolha o tipo de conexao</p>
        <p className="text-xs text-muted-foreground">
          Selecione como deseja conectar o WhatsApp a esta caixa de entrada.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Card Evolution — QR Code */}
        <Card className="cursor-pointer border-border/50 bg-secondary/20 transition-colors hover:border-border hover:bg-secondary/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <QrCode className="h-5 w-5" />
              WhatsApp via QR Code
            </CardTitle>
            <CardDescription>
              Conecte escaneando o QR Code com qualquer numero WhatsApp
              (Evolution API). Ideal para numeros pessoais ou de negocio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Qualquer numero WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Conexao via QR Code no celular
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Sem aprovacao da Meta necessaria
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
              Requer numero verificado pela Meta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Numero verificado pelo Meta
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                API oficial e estavel
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
      </div>
    </div>
  )
}

export default ConnectionProviderSelector
