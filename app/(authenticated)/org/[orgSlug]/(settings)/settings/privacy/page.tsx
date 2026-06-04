import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDsrRequests } from '@/_data-access/privacy/get-dsr-requests'
import { getEmailBlocklist } from '@/_data-access/privacy/get-email-blocklist'
import { isElevated } from '@/_lib/rbac'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { DsrRequestsTab } from '@/(authenticated)/org/[orgSlug]/(settings)/settings/privacy/_components/dsr-requests-tab'
import { BlocklistTab } from '@/(authenticated)/org/[orgSlug]/(settings)/settings/privacy/_components/blocklist-tab'

interface PrivacySettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const PrivacySettingsPage = async ({ params }: PrivacySettingsPageProps) => {
  const { orgSlug } = await params

  // Página temporariamente desativada — em reestruturação
  redirect(`/org/${orgSlug}/settings/organization`)

  const ctx = await getOrgContext(orgSlug)

  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/settings/organization`)
  }

  const [dsrRequests, blocklist] = await Promise.all([
    getDsrRequests(ctx),
    getEmailBlocklist(ctx),
  ])

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Privacidade & LGPD</HeaderTitle>
          <HeaderSubTitle>
            Gerencie solicitações de direitos dos titulares e registros de exclusão.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <Tabs defaultValue="dsr">
        <TabsList className="grid h-12 w-full grid-cols-2 border border-border/50 bg-tab/30">
          <TabsTrigger value="dsr">
            Solicitações DSR ({dsrRequests.length})
          </TabsTrigger>
          <TabsTrigger value="blocklist">
            Lista de Saída ({blocklist.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dsr" className="mt-4">
          <DsrRequestsTab requests={dsrRequests} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent value="blocklist" className="mt-4">
          <BlocklistTab entries={blocklist} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PrivacySettingsPage
