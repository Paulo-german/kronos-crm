import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Button } from '@/_components/ui/button'
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
    isConnected: !!inbox.evolutionInstanceName,
  }))

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 md:px-8">
        <Header>
          <HeaderLeft>
            <HeaderTitle>Caixa de Entrada</HeaderTitle>
            <HeaderSubTitle>
              Gerencie suas conversas com clientes.
            </HeaderSubTitle>
          </HeaderLeft>
          <HeaderRight>
            <Button variant="outline" asChild>
              <Link href={`/org/${orgSlug}/settings/inboxes`}>
                <Settings2 className="mr-2 h-4 w-4" />
                Gerenciar Caixas
              </Link>
            </Button>
          </HeaderRight>
        </Header>
      </div>

      <div className="mt-6 min-h-0 flex-1">
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
