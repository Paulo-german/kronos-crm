import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getInboxes } from '@/_data-access/inbox/get-inboxes'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import { getContactsOptions } from '@/_data-access/contact/get-contacts-options'
import { InboxClient } from './_components/inbox-client'

interface InboxPageProps {
  params: Promise<{ orgSlug: string }>
}

const InboxPage = async ({ params }: InboxPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [inboxes, dealOptions, contactOptions] = await Promise.all([
    getInboxes(ctx.orgId),
    getDealsOptions(ctx),
    getContactsOptions(ctx),
  ])

  const inboxOptions = inboxes.map((inbox) => ({
    id: inbox.id,
    name: inbox.name,
    channel: inbox.channel,
    isConnected: !!inbox.evolutionInstanceName || !!inbox.metaPhoneNumberId,
  }))

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <InboxClient
          inboxOptions={inboxOptions}
          dealOptions={dealOptions}
          contactOptions={contactOptions}
          orgSlug={orgSlug}
        />
      </div>
    </div>
  )
}

export default InboxPage
