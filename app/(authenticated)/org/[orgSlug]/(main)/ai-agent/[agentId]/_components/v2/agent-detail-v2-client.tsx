'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ArrowLeft, CircleIcon, MessageSquare } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { updateAgent } from '@/_actions/agent/update-agent'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { MemberRole } from '@prisma/client'
import GeneralTab from '../general-tab'
import ProcessTab from '../process-tab'
import KnowledgeTab from '../knowledge-tab'
import ConnectionTab from '../connection-tab'
import FollowUpsTab from '../follow-ups-tab'
import TestChatPanel from '../test-chat-panel'
import GlobalToolsSection from './global-tools-section'
import { PageTourTrigger } from '@/_components/onboarding/page-tour-trigger'
import { AGENT_DETAIL_TOUR_STEPS } from '@/_lib/onboarding/tours/agent-detail-tour'
import type {
  FollowUpDto,
  ExhaustedConfig,
} from '@/_data-access/follow-up/types'
import type { InboxConnectionDataMap } from '../agent-detail-client'

interface InboxOptionDto {
  id: string
  name: string
  channel: string
  agentId: string | null
}

interface AgentDetailV2ClientProps {
  agent: AgentDetailDto
  pipelines: OrgPipelineDto[]
  pipelineStages: PipelineStageOption[]
  userRole: MemberRole
  orgSlug: string
  availableInboxes: InboxOptionDto[]
  inboxConnectionData: InboxConnectionDataMap
  followUps: FollowUpDto[]
  followUpQuota?: { withinQuota: boolean; current: number; limit: number }
  followUpExhaustedAction?: 'NONE' | 'NOTIFY_HUMAN' | 'MOVE_DEAL_STAGE'
  followUpExhaustedConfig?: ExhaustedConfig | null
  hasActiveServices: boolean
}

const AgentDetailV2Client = ({
  agent,
  pipelines,
  pipelineStages,
  userRole,
  orgSlug,
  availableInboxes,
  inboxConnectionData,
  followUps,
  followUpQuota,
  followUpExhaustedAction,
  followUpExhaustedConfig,
  hasActiveServices,
}: AgentDetailV2ClientProps) => {
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'SUPPORT'

  const [isActive, setIsActive] = useState(agent.isActive)

  const updateAgentAction = useAction(updateAgent, {
    onSuccess: () => {
      toast.success(isActive ? 'Agente ativado' : 'Agente desativado')
    },
    onError: () => {
      setIsActive((prev) => !prev)
      toast.error('Erro ao alterar status do agente')
    },
  })

  const handleToggleActive = (checked: boolean) => {
    setIsActive(checked)
    updateAgentAction.execute({ id: agent.id, isActive: checked })
  }

  const [configVersion, setConfigVersion] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleConfigSaved = useCallback(() => {
    setConfigVersion((prev) => prev + 1)
  }, [])

  return (
    <TooltipProvider>
      <div className="flex flex-1 min-h-0 min-w-0 bg-background">
        <div className="flex flex-1 min-w-0 flex-col gap-6 overflow-x-hidden overflow-y-auto p-6">
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
              {isActive ? (
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-6 gap-1.5 px-2 text-xs font-semibold text-muted-foreground"
                  >
                    Nova geração
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Nova geração: guard de qualidade, validação de preço e suporte
                  a mídia inline.
                </TooltipContent>
              </Tooltip>
              {canManage && (
                <Switch
                  checked={isActive}
                  onCheckedChange={handleToggleActive}
                  disabled={updateAgentAction.isPending}
                />
              )}
            </div>
          </div>

          <Tabs defaultValue="general">
            <TabsList
              data-tour="agent-tabs"
              className="grid h-12 w-full grid-cols-5 rounded-md border border-border/50 bg-tab/30"
            >
              <TabsTrigger value="general" className="rounded-md py-2 data-[state=active]:bg-card/80">
                Geral
              </TabsTrigger>
              <TabsTrigger value="process" className="rounded-md py-2 data-[state=active]:bg-card/80">
                Processo
              </TabsTrigger>
              <TabsTrigger
                value="knowledge"
                data-tour="agent-knowledge"
                className="rounded-md py-2 data-[state=active]:bg-card/80"
              >
                Conhecimento
              </TabsTrigger>
              <TabsTrigger value="connection" className="rounded-md py-2 data-[state=active]:bg-card/80">
                Conexão
              </TabsTrigger>
              <TabsTrigger value="follow-ups" className="rounded-md py-2 data-[state=active]:bg-card/80">
                Follow-ups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
              <GeneralTab
                agent={agent}
                pipelines={pipelines}
                canManage={canManage}
                onSaveSuccess={handleConfigSaved}
                hasActiveServices={hasActiveServices}
              />
            </TabsContent>

            <TabsContent value="process" className="mt-6 space-y-4">
              <ProcessTab
                agent={agent}
                canManage={canManage}
                pipelineStages={pipelineStages}
                pipelines={pipelines}
                onSaveSuccess={handleConfigSaved}
                excludeGlobalTools
              />
              <GlobalToolsSection
                agent={agent}
                canManage={canManage}
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

            <TabsContent value="follow-ups" className="mt-6">
              <FollowUpsTab
                agent={{
                  ...agent,
                  followUpExhaustedAction: followUpExhaustedAction ?? 'NONE',
                  followUpExhaustedConfig: followUpExhaustedConfig ?? null,
                }}
                followUps={followUps}
                pipelineStages={pipelineStages}
                canManage={canManage}
                onSaveSuccess={handleConfigSaved}
                followUpQuota={followUpQuota}
              />
            </TabsContent>
          </Tabs>
        </div>

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

      {!isChatOpen && (
        <div className="fixed right-6 top-1/2 z-50 -translate-y-1/2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                data-tour="agent-test"
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

      <PageTourTrigger tourId="agent-detail" steps={AGENT_DETAIL_TOUR_STEPS} />
    </TooltipProvider>
  )
}

export default AgentDetailV2Client
