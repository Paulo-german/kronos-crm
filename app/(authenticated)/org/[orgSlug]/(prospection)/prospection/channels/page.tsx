import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { isElevated } from '@/_lib/rbac'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Button } from '@/_components/ui/button'
import { ChannelsList } from './_components/channels-list'
import { CreateChannelDialog } from './_components/create-channel-dialog'

// Provedores de WhatsApp suportados no Prospection
const PROSPECTION_CHANNEL_TYPES = new Set(['META_CLOUD', 'Z_API'])

interface ProspectionChannelsPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProspectionChannelsPage = async ({
  params,
}: ProspectionChannelsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Conexão de canais (credenciais) é restrita a roles elevados
  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/prospection/home`)
  }

  const [inboxes, quota] = await Promise.all([
    getInboxes(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'inbox'),
  ])

  const channels = inboxes.filter(
    (inbox) =>
      inbox.channel === 'WHATSAPP' &&
      PROSPECTION_CHANNEL_TYPES.has(inbox.connectionType),
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Canais</HeaderTitle>
          <HeaderSubTitle>
            Conecte números de WhatsApp para disparar suas campanhas.
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateChannelDialog
            orgSlug={orgSlug}
            withinQuota={quota.withinQuota}
            trigger={
              <Button>
                <Plus className="size-4" />
                Conectar canal
              </Button>
            }
          />
        </HeaderRight>
      </Header>

      <ChannelsList
        channels={channels}
        orgSlug={orgSlug}
        withinQuota={quota.withinQuota}
      />
    </div>
  )
}

export default ProspectionChannelsPage
