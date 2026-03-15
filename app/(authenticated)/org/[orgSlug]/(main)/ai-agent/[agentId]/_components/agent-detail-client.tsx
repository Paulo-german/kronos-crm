'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, CircleIcon, MessageSquare } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import type { EvolutionInstanceInfo } from '@/_lib/evolution/types-instance'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { MemberRole } from '@prisma/client'
import GeneralTab from './general-tab'
import ProcessTab from './process-tab'
import KnowledgeTab from './knowledge-tab'
import ConnectionTab from './connection-tab'
import TestChatPanel from './test-chat-panel'

interface InboxOptionDto {
  id: string
  name: string
  channel: string
  agentId: string | null
}

export interface InboxConnectionDataMap {
  [inboxId: string]: {
    stats: AgentConnectionStats | null
    info: EvolutionInstanceInfo | null
  }
}

interface AgentDetailClientProps {
  agent: AgentDetailDto
  pipelines: OrgPipelineDto[]
  pipelineStages: PipelineStageOption[]
  userRole: MemberRole
  orgSlug: string
  availableInboxes: InboxOptionDto[]
  inboxConnectionData: InboxConnectionDataMap
}

const AgentDetailClient = ({
  agent,
  pipelines,
  pipelineStages,
  userRole,
  orgSlug,
  availableInboxes,
  inboxConnectionData,
}: AgentDetailClientProps) => {
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  // Contador de versão da configuração — incrementado toda vez que qualquer
  // tab salva dados. O TestChatPanel observa esse valor para auto-reset.
  const [configVersion, setConfigVersion] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleConfigSaved = useCallback(() => {
    setConfigVersion((prev) => prev + 1)
  }, [])

  return (
    <TooltipProvider>
      {/* Layout principal: conteúdo + painel lateral do chat */}
      <div className="flex flex-1 min-h-0 bg-background">
        {/* Conteúdo principal — flex-1 para ceder espaço ao painel quando aberto */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {/* Back + Title */}
          <div className="flex flex-col gap-4">
            <Button variant="ghost" size="sm" className="w-fit" asChild>
              <Link href={`/org/${orgSlug}/ai-agent`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {agent.name}
              </h1>
              {agent.isActive ? (
                <Badge
                  variant="outline"
                  className="h-6 gap-1.5 border-kronos-green/20 bg-kronos-green/10 px-2 text-xs font-semibold text-kronos-green hover:bg-kronos-green/20"
                >
                  <CircleIcon className="h-1.5 w-1.5 fill-current" />
                  Ativo
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="h-6 gap-1.5 px-2 text-xs font-semibold"
                >
                  <CircleIcon className="h-1.5 w-1.5 fill-current" />
                  Inativo
                </Badge>
              )}
            </div>
          </div>

          {/* Tabs — mantém grid-cols-4 sem adicionar 5a tab */}
          <Tabs defaultValue="general">
            <TabsList className="grid h-12 w-full grid-cols-4 rounded-md border border-border/50 bg-tab/30">
              <TabsTrigger
                value="general"
                className="rounded-md py-2 data-[state=active]:bg-card/80"
              >
                Geral
              </TabsTrigger>
              <TabsTrigger
                value="process"
                className="rounded-md py-2 data-[state=active]:bg-card/80"
              >
                Processo
              </TabsTrigger>
              <TabsTrigger
                value="knowledge"
                className="rounded-md py-2 data-[state=active]:bg-card/80"
              >
                Conhecimento
              </TabsTrigger>
              <TabsTrigger
                value="connection"
                className="rounded-md py-2 data-[state=active]:bg-card/80"
              >
                Conexão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
              <GeneralTab
                agent={agent}
                pipelines={pipelines}
                canManage={canManage}
                onSaveSuccess={handleConfigSaved}
              />
            </TabsContent>

            <TabsContent value="process" className="mt-6">
              <ProcessTab
                agent={agent}
                canManage={canManage}
                pipelineStages={pipelineStages}
                onSaveSuccess={handleConfigSaved}
              />
            </TabsContent>

            <TabsContent value="knowledge" className="mt-6">
              <KnowledgeTab
                agent={agent}
                canManage={canManage}
                onSaveSuccess={handleConfigSaved}
              />
            </TabsContent>

            <TabsContent value="connection" className="mt-6">
              <ConnectionTab
                agent={agent}
                canManage={canManage}
                availableInboxes={availableInboxes}
                inboxConnectionData={inboxConnectionData}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Painel lateral do chat de teste — renderizado apenas quando aberto */}
        {isChatOpen && (
          <div className="h-full">
            <TestChatPanel
              agentId={agent.id}
              agentName={agent.name}
              configVersion={configVersion}
              orgSlug={orgSlug}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Botão flutuante para abrir o chat — visível apenas quando fechado */}
      {!isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => setIsChatOpen(true)}
                className="h-12 w-12 rounded-full shadow-lg"
                aria-label="Abrir chat de teste do agente"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Testar agente</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </TooltipProvider>
  )
}

export default AgentDetailClient
