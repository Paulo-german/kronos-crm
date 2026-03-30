import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { getAgents } from '@/_data-access/agent/get-agents'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { Button } from '@/_components/ui/button'
import { InboxesCardGrid } from './_components/inboxes-card-grid'
import DiscoverInstancesButton from './_components/discover-instances-button'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'

interface InboxesPageProps {
  params: Promise<{ orgSlug: string }>
}

const InboxesPage = async ({ params }: InboxesPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [inboxes, agents, quota] = await Promise.all([
    getInboxes(ctx.orgId),
    getAgents(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'inbox'),
  ])

  const agentOptions = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
  }))

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
      <Header>
        <HeaderLeft>
          <HeaderTitle>Caixas de Entrada</HeaderTitle>
          <HeaderSubTitle>
            Gerencie suas conexões WhatsApp e canais de atendimento
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="inbox" />
        </HeaderLeft>
        <HeaderRight>
          <DiscoverInstancesButton />
        </HeaderRight>
      </Header>
      <InboxesCardGrid
        inboxes={inboxes}
        agentOptions={agentOptions}
        orgSlug={orgSlug}
        withinQuota={quota.withinQuota}
      />
    </div>
  )
}

export default InboxesPage
