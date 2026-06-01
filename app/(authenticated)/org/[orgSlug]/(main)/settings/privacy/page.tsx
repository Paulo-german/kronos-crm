import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDsrRequests } from '@/_data-access/privacy/get-dsr-requests'
import { getEmailBlocklist } from '@/_data-access/privacy/get-email-blocklist'
import { isElevated } from '@/_lib/rbac'
import { Button } from '@/_components/ui/button'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { DsrRequestsTab } from './_components/dsr-requests-tab'
import { BlocklistTab } from './_components/blocklist-tab'

interface PrivacySettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const PrivacySettingsPage = async ({ params }: PrivacySettingsPageProps) => {
  const { orgSlug } = await params

  // Página temporariamente desativada — em reestruturação
  redirect(`/org/${orgSlug}/settings`)

  const ctx = await getOrgContext(orgSlug)

  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/settings`)
  }

  const [dsrRequests, blocklist] = await Promise.all([
    getDsrRequests(ctx),
    getEmailBlocklist(ctx),
  ])

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </Button>
      </div>

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
