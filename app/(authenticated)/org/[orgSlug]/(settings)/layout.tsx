import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { AccountMenu } from '@/_components/layout/account-menu'
import { BackButton } from '@/_components/layout/back-button'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { SettingsSidebar } from '@/_components/layout/sidebars/settings-sidebar'

interface SettingsLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const SettingsLayout = async ({ children, params }: SettingsLayoutProps) => {
  const { orgSlug } = await params
  const { orgId, userId } = await getOrgContext(orgSlug)

  const [trialStatus, user] = await Promise.all([
    getTrialStatus(orgId),
    getUserById(userId),
  ])

  if (trialStatus.isExpired) {
    redirect(`/org/${orgSlug}/plans`)
  }

  const topBarUser = {
    fullName: user?.fullName ?? null,
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-primary-dark">
      <header className="relative flex h-14 shrink-0 items-center justify-between bg-background px-4 shadow-[0_2px_24px_0_hsl(261_8%_20%/0.20)]">
        <div className="flex items-center gap-3">
          <BackButton href={`/org/${orgSlug}/crm/home`} />
          <Link href={`/org/${orgSlug}/crm/home`} className="flex items-center gap-2">
            <KronosLogo className="text-foreground" />
            <span className="text-xl font-bold tracking-tight text-foreground">KRONOS</span>
            <span className="relative ml-0.5 -translate-y-1 align-top text-[10px] font-semibold tracking-widest text-primary">
              HUB
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <AccountMenu user={topBarUser} orgSlug={orgSlug} />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar orgSlug={orgSlug} />
        <main className="min-h-0 flex-1 overflow-y-auto rounded-tl-2xl bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}

export default SettingsLayout
