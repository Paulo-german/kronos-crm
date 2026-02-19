import { AppSidebar } from '@/_components/layout/app-sidebar'
import HeaderStick from '@/_components/layout/header-stick'
import { ContentWrapper } from '@/(authenticated)/_components/content-wrapper'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { TrialBanner } from '@/_components/trial/trial-banner'
import { TrialGateClient } from '@/_components/trial/trial-gate-client'
import { PlanBadgeClient } from '@/_components/trial/plan-badge-client'
import { TrialReminderDialog } from '@/_components/trial/trial-reminder-dialog'
import { getUserById } from '@/_data-access/user/get-user-by-id'

interface MainLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const MainLayout = async ({ children, params }: MainLayoutProps) => {
  const { orgSlug } = await params
  const { orgId, userId, userRole } = await getOrgContext(orgSlug)

  const [trialStatus, { plan }, user] = await Promise.all([
    getTrialStatus(orgId),
    getPlanLimits(orgId),
    getUserById(userId),
  ])

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <TrialBanner orgId={orgId} orgSlug={orgSlug} userRole={userRole} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar
          footerSlot={
            <PlanBadgeClient
              phase={trialStatus.phase}
              daysRemaining={trialStatus.daysRemaining}
              planName={plan}
              orgSlug={orgSlug}
            />
          }
        />
        <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
          <HeaderStick userEmail={user?.email} />
          <TrialGateClient isExpired={trialStatus.isExpired} orgSlug={orgSlug}>
            <ContentWrapper>{children}</ContentWrapper>
          </TrialGateClient>
          {trialStatus.isOnTrial && trialStatus.daysRemaining <= 5 && (
            <TrialReminderDialog
              daysRemaining={trialStatus.daysRemaining}
              orgSlug={orgSlug}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default MainLayout
