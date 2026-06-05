import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAgentGroupById } from '@/_data-access/agent-group/get-agent-group-by-id'
import { getAgentGroupRoutingStats } from '@/_data-access/agent-group/get-agent-group-routing-stats'
import { RoutingAnalyticsCard } from '@/(authenticated)/org/[orgSlug]/(agents)/agents/ai-agent/groups/[groupId]/_components/routing-analytics-card'

interface AgentGroupExecutionsPageProps {
  params: Promise<{ orgSlug: string; groupId: string }>
}

const AgentGroupExecutionsPage = async ({ params }: AgentGroupExecutionsPageProps) => {
  const { orgSlug, groupId } = await params
  const ctx = await getOrgContext(orgSlug)

  const [group, routingStats] = await Promise.all([
    getAgentGroupById(groupId, ctx.orgId),
    getAgentGroupRoutingStats(groupId, ctx.orgId),
  ])

  if (!group) notFound()

  return (
    <div className="flex flex-1 min-h-0 bg-background">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <div className="flex flex-col gap-4">
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href={`/org/${orgSlug}/agents/ai-agent/groups/${groupId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para configuração
            </Link>
          </Button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Execuções</h1>
            <p className="text-sm text-muted-foreground">{group.name}</p>
          </div>
        </div>

        <RoutingAnalyticsCard stats={routingStats} />
      </div>
    </div>
  )
}

export default AgentGroupExecutionsPage
