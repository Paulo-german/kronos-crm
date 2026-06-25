import { notFound, redirect } from 'next/navigation'
import type { ConnectionType } from '@prisma/client'
import { isElevated } from '@/_lib/rbac'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxById } from '@/_data-access/inbox/get-inbox-by-id'
import { BackButton } from '@/_components/layout/back-button'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { getConnectionLabel } from '../../_lib/broadcast-labels'
import { ChannelConnection } from './_components/channel-connection'

// Provedores com card de conexão no Prospection (Evolution ainda em configuração
// é permitido aqui para o usuário informar o servidor próprio).
const PROSPECTION_CHANNEL_TYPES = new Set([
  'META_CLOUD',
  'Z_API',
  'EVOLUTION',
  'EVOLUTION_JS',
  'EVOLUTION_GO',
])

interface ChannelDetailPageProps {
  params: Promise<{ orgSlug: string; inboxId: string }>
}

const ChannelDetailPage = async ({ params }: ChannelDetailPageProps) => {
  const { orgSlug, inboxId } = await params
  const ctx = await getOrgContext(orgSlug)

  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/prospection/channels`)
  }

  const inbox = await getInboxById(inboxId, ctx.orgId)
  if (!inbox) notFound()

  // Só canais WhatsApp dos provedores suportados aqui
  if (
    inbox.channel !== 'WHATSAPP' ||
    !PROSPECTION_CHANNEL_TYPES.has(inbox.connectionType)
  ) {
    redirect(`/org/${orgSlug}/prospection/channels`)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton href={`/org/${orgSlug}/prospection/channels`} />
      <Header>
        <HeaderLeft>
          <HeaderTitle>{inbox.name}</HeaderTitle>
          <HeaderSubTitle>
            {getConnectionLabel(inbox.connectionType as ConnectionType)}
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <ChannelConnection inbox={inbox} canManage={isElevated(ctx.userRole)} />
    </div>
  )
}

export default ChannelDetailPage
