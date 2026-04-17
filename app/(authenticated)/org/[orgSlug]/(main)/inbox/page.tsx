import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import { getContactsOptions } from '@/_data-access/contact/get-contacts-options'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getConversationLabels } from '@/_data-access/conversation-label/get-conversation-labels'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { getAgents } from '@/_data-access/agent/get-agents'
import { InboxClient } from './_components/inbox-client'

interface InboxPageProps {
  params: Promise<{ orgSlug: string }>
}

const InboxPage = async ({ params }: InboxPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [inboxes, dealOptions, contactOptions, orgMembers, labels, user, agents] = await Promise.all([
    getInboxes(ctx.orgId),
    getDealsOptions(ctx),
    getContactsOptions(ctx),
    getOrganizationMembers(ctx.orgId),
    getConversationLabels(ctx.orgId),
    getUserById(ctx.userId),
    getAgents(ctx.orgId),
  ])

  const isSuperAdmin = user?.isSuperAdmin ?? false

  const inboxOptions = inboxes.map((inbox) => ({
    id: inbox.id,
    name: inbox.name,
    channel: inbox.channel,
    // SIMULATOR é sempre considerado conectado — não precisa de provider externo
    isConnected: inbox.connectionType === 'SIMULATOR'
      || (!!inbox.evolutionInstanceName && inbox.evolutionConnected)
      || !!inbox.metaPhoneNumberId
      || !!inbox.zapiInstanceId,
  }))

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <InboxClient
          inboxOptions={inboxOptions}
          dealOptions={dealOptions}
          contactOptions={contactOptions}
          orgSlug={orgSlug}
          members={orgMembers.accepted}
          userRole={ctx.userRole}
          currentUserId={ctx.userId}
          availableLabels={labels}
          isSuperAdmin={isSuperAdmin}
          agents={agents}
        />
      </div>
    </div>
  )
}

export default InboxPage
