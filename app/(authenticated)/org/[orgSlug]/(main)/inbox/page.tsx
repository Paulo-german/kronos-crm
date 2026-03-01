import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getConversations } from '@/_data-access/conversation/get-conversations'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { InboxClient } from './_components/inbox-client'

interface InboxPageProps {
  params: Promise<{ orgSlug: string }>
}

const InboxPage = async ({ params }: InboxPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [conversations, inboxes] = await Promise.all([
    getConversations(ctx.orgId),
    getInboxes(ctx.orgId),
  ])

  const inboxOptions = inboxes.map((inbox) => ({
    id: inbox.id,
    name: inbox.name,
    channel: inbox.channel,
  }))

  return (
    <InboxClient
      conversations={conversations}
      inboxOptions={inboxOptions}
      orgSlug={orgSlug}
    />
  )
}

export default InboxPage
