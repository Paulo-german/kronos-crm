'use client'

import Link from 'next/link'
import { ArrowLeft, CircleIcon } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { MemberRole } from '@prisma/client'
import GeneralTab from './general-tab'
import ProcessTab from './process-tab'
import KnowledgeTab from './knowledge-tab'
import ConnectionTab from './connection-tab'

interface InboxOptionDto {
  id: string
  name: string
  channel: string
  agentId: string | null
}

interface AgentDetailClientProps {
  agent: AgentDetailDto
  pipelines: OrgPipelineDto[]
  userRole: MemberRole
  orgSlug: string
  availableInboxes: InboxOptionDto[]
}

const AgentDetailClient = ({
  agent,
  pipelines,
  userRole,
  orgSlug,
  availableInboxes,
}: AgentDetailClientProps) => {
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  return (
    <div className="flex h-fit flex-col gap-6 bg-background p-6">
      {/* Back + Title */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href={`/org/${orgSlug}/ai-agent`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
          {agent.isActive ? (
            <Badge
              variant="outline"
              className="h-6 gap-1.5 px-2 text-xs font-semibold bg-kronos-green/10 text-kronos-green border-kronos-green/20 hover:bg-kronos-green/20"
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

      {/* Tabs */}
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
          />
        </TabsContent>

        <TabsContent value="process" className="mt-6">
          <ProcessTab
            agent={agent}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeTab
            agent={agent}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="connection" className="mt-6">
          <ConnectionTab
            agent={agent}
            canManage={canManage}
            availableInboxes={availableInboxes}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AgentDetailClient
