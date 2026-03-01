import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getConversations } from '@/_data-access/conversation/get-conversations'
import { InboxClient } from './_components/inbox-client'

interface InboxPageProps {
  params: Promise<{ orgSlug: string }>
}

const InboxPage = async ({ params }: InboxPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const conversations = await getConversations(ctx.orgId)

  return <InboxClient conversations={conversations} />
}

export default InboxPage
