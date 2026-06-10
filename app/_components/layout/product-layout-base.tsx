import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { getOnboardingStatus } from '@/_data-access/organization/get-onboarding-status'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { getOrgModules } from '@/_data-access/module/get-org-modules'
import { getCreditBalance } from '@/_data-access/billing/get-credit-balance'
import { getUnreadNotificationCount } from '@/_data-access/notification/get-unread-notification-count'
import { getRecentNotifications } from '@/_data-access/notification/get-recent-notifications'
import {
  getPendingInviteNotifications,
  getPendingInviteUnreadCount,
} from '@/_data-access/notification/get-pending-invite-notifications'
import { getUserProfileStatus } from '@/_data-access/user-profile/get-user-profile-status'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import { ProductTopBar } from '@/_components/layout/product-top-bar'
import { ProductTheme } from '@/_components/layout/product-theme'
import type { ModuleSlug } from '@/_data-access/module/types'
import { ContentWrapper } from '@/(authenticated)/_components/content-wrapper'
import { TrialBanner } from '@/_components/trial/trial-banner'
import { TrialReminderDialog } from '@/_components/trial/trial-reminder-dialog'
import { DashboardTourTrigger } from '@/_components/onboarding/dashboard-tour-trigger'
import { WelcomeSurveyModal } from '@/_components/welcome-survey/welcome-survey-modal'

type Product = 'crm' | 'inbox' | 'agents'

interface ProductLayoutBaseProps {
  orgSlug: string
  product: Product
  sidebar: React.ReactNode
  withCredits?: boolean
  withWelcomeSurvey?: boolean
  withDashboardTour?: boolean
  children: React.ReactNode
}

export const ProductLayoutBase = async ({
  orgSlug,
  product,
  sidebar,
  withCredits = false,
  withWelcomeSurvey = false,
  withDashboardTour = false,
  children,
}: ProductLayoutBaseProps) => {
  const { orgId, userId, userRole } = await getOrgContext(orgSlug)

  // promessas criadas antes do Promise.all para que fetches condicionais também rodem em paralelo
  const creditBalancePromise = withCredits
    ? getCreditBalance(orgId)
    : Promise.resolve(null)
  const profileCompletedPromise = withWelcomeSurvey
    ? getUserProfileStatus(userId, orgId)
    : Promise.resolve(true)

  const [
    trialStatus,
    onboardingStatus,
    user,
    activeModules,
    creditBalance,
    unreadCount,
    recentNotifications,
    profileCompleted,
    completedTutorialIds,
  ] = await Promise.all([
    getTrialStatus(orgId),
    getOnboardingStatus(orgId),
    getUserById(userId),
    getOrgModules(orgId),
    creditBalancePromise,
    getUnreadNotificationCount(userId, orgId),
    getRecentNotifications(userId, orgId),
    profileCompletedPromise,
    getTutorialCompletions(userId, orgId),
  ])

  if (!onboardingStatus.onboardingCompleted && !trialStatus.isExpired) {
    redirect(`/org/${orgSlug}/onboarding`)
  }

  if (trialStatus.isExpired) {
    redirect(`/org/${orgSlug}/plans`)
  }

  const userEmail = user?.email ?? ''
  const [pendingInviteNotifications, pendingInviteUnreadCount] = userEmail
    ? await Promise.all([
        getPendingInviteNotifications(userId, userEmail),
        getPendingInviteUnreadCount(userId, userEmail),
      ])
    : [[], 0]

  const mergedNotifications = [
    ...recentNotifications,
    ...pendingInviteNotifications,
  ]
    .sort(
      (notificationA, notificationB) =>
        new Date(notificationB.createdAt).getTime() -
        new Date(notificationA.createdAt).getTime(),
    )
    .slice(0, 10)

  const totalUnreadCount = unreadCount + pendingInviteUnreadCount
  const activeModuleSlugs = activeModules.map((mod) => mod.slug as ModuleSlug)

  const topBarUser = {
    fullName: user?.fullName ?? null,
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-primary-dark">
      <ProductTheme product={product} />
      <TrialBanner orgId={orgId} orgSlug={orgSlug} userRole={userRole} />
      <ProductTopBar
        product={product}
        orgSlug={orgSlug}
        user={topBarUser}
        activeModules={activeModuleSlugs}
        initialUnreadCount={totalUnreadCount}
        initialNotifications={mergedNotifications}
        completedTutorialIds={completedTutorialIds}
        isSuperAdmin={user?.isSuperAdmin ?? false}
        credits={
          creditBalance
            ? {
                available: creditBalance.available,
                monthlyLimit: creditBalance.monthlyLimit,
              }
            : undefined
        }
      />
      <div className="flex min-h-0 flex-1">
        {sidebar}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ContentWrapper>{children}</ContentWrapper>
          {trialStatus.isOnTrial && trialStatus.daysRemaining <= 5 && (
            <TrialReminderDialog
              daysRemaining={trialStatus.daysRemaining}
              orgSlug={orgSlug}
            />
          )}
        </div>
      </div>
      {withDashboardTour && <DashboardTourTrigger />}
      {withWelcomeSurvey && userRole === 'OWNER' && !profileCompleted && (
        <WelcomeSurveyModal />
      )}
    </div>
  )
}
