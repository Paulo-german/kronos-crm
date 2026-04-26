import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { getOrgModules } from '@/_data-access/module/get-org-modules'
import { deriveFirstName } from './_lib/derive-first-name'
import type { ModuleSlug } from '@/_data-access/module/types'
import HomeGreeting from './_components/home-greeting'
import QuickAccessGrid from './_components/quick-access-grid'
import PlatformMap from './_components/platform-map'
import OnboardingChecklist from './_components/onboarding-checklist'
import EcosystemGrid from './_components/ecosystem-grid'

interface HomePageProps {
  params: Promise<{ orgSlug: string }>
}

const HomePage = async ({ params }: HomePageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [user, modules] = await Promise.all([
    getUserById(ctx.userId),
    getOrgModules(ctx.orgId),
  ])

  const firstName = deriveFirstName(user?.fullName ?? null, user?.email ?? '')
  const activeModuleSlugs = modules.map((mod) => mod.slug as ModuleSlug)

  return (
    <div className="flex flex-col gap-8 p-6">
      <HomeGreeting firstName={firstName} />
      <QuickAccessGrid orgSlug={orgSlug} activeModules={activeModuleSlugs} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformMap />
        <OnboardingChecklist orgSlug={orgSlug} activeModules={activeModuleSlugs} />
      </div>
      <EcosystemGrid />
    </div>
  )
}

export default HomePage
