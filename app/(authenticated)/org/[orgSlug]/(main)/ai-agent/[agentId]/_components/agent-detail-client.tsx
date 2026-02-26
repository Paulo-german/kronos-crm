'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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

interface AgentDetailClientProps {
  agent: AgentDetailDto
  pipelines: OrgPipelineDto[]
  userRole: MemberRole
  orgSlug: string
}

const AgentDetailClient = ({
  agent,
  pipelines,
  userRole,
  orgSlug,
}: AgentDetailClientProps) => {
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-4 pt-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/org/${orgSlug}/ai-agent`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{agent.name}</h2>
          {agent.isActive ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              Ativo
            </Badge>
          ) : (
            <Badge variant="secondary">Inativo</Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="process">Processo</TabsTrigger>
          <TabsTrigger value="knowledge">Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="connection">Conexão WhatsApp</TabsTrigger>
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
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AgentDetailClient
