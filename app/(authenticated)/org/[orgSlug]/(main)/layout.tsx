import { redirect } from 'next/navigation'
import { AppSidebar } from '@/_components/layout/app-sidebar'
import { TopBarWrapper } from '@/_components/layout/top-bar-wrapper'
import { ContentWrapper } from '@/(authenticated)/_components/content-wrapper'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getOnboardingStatus } from '@/_data-access/organization/get-onboarding-status'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { TrialBanner } from '@/_components/trial/trial-banner'
import { TrialGateClient } from '@/_components/trial/trial-gate-client'
import { TrialReminderDialog } from '@/_components/trial/trial-reminder-dialog'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { getOrgModules } from '@/_data-access/module/get-org-modules'
import { getCreditBalance } from '@/_data-access/billing/get-credit-balance'
import { getUserOrganizations } from '@/_data-access/organization/get-user-organizations'
import { DashboardTourTrigger } from '@/_components/onboarding/dashboard-tour-trigger'
import { getUnreadNotificationCount } from '@/_data-access/notification/get-unread-notification-count'
import { getRecentNotifications } from '@/_data-access/notification/get-recent-notifications'
import {
  getPendingInviteNotifications,
  getPendingInviteUnreadCount,
} from '@/_data-access/notification/get-pending-invite-notifications'
import { getUserProfileStatus } from '@/_data-access/user-profile/get-user-profile-status'
import { WelcomeSurveyModal } from '@/_components/welcome-survey/welcome-survey-modal'

interface MainLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const MainLayout = async ({ children, params }: MainLayoutProps) => {
  const { orgSlug } = await params
  const { orgId, userId, userRole } = await getOrgContext(orgSlug)

  const [
    onboardingStatus,
    trialStatus,
    user,
    activeModules,
    creditBalance,
    userOrganizations,
    unreadCount,
    recentNotifications,
    profileCompleted,
  ] = await Promise.all([
    getOnboardingStatus(orgId),
    getTrialStatus(orgId),
    getUserById(userId),
    getOrgModules(orgId),
    getCreditBalance(orgId),
    getUserOrganizations(userId),
    getUnreadNotificationCount(userId, orgId),
    getRecentNotifications(userId, orgId),
    getUserProfileStatus(userId),
  ])

  // Buscar notificações de orgs com convite pendente (cross-org)
  const userEmail = user?.email ?? ''
  const [pendingInviteNotifications, pendingInviteUnreadCount] =
    userEmail
      ? await Promise.all([
          getPendingInviteNotifications(userId, userEmail),
          getPendingInviteUnreadCount(userId, userEmail),
        ])
      : [[], 0]

  // Mergear notificações da org atual com convites pendentes
  const mergedNotifications = [...recentNotifications, ...pendingInviteNotifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  const totalUnreadCount = unreadCount + pendingInviteUnreadCount

  if (!onboardingStatus.onboardingCompleted) {
    redirect(`/org/${orgSlug}/onboarding`)
  }

  const activeModuleSlugs = activeModules.map((mod) => mod.slug) as Array<
    'crm' | 'inbox' | 'ai-agent'
  >

  const topBarUser = {
    id: userId,
    fullName: user?.fullName ?? null,
    email: user?.email ?? '',
    avatarUrl: user?.avatarUrl ?? null,
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      <TrialBanner orgId={orgId} orgSlug={orgSlug} userRole={userRole} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar
          activeModules={activeModuleSlugs}
          organizations={userOrganizations}
          isSuperAdmin={user?.isSuperAdmin ?? false}
          credits={{
            available: creditBalance.available,
            monthlyLimit: creditBalance.monthlyLimit,
            orgSlug,
          }}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TopBarWrapper
            user={topBarUser}
            orgSlug={orgSlug}
            initialUnreadCount={totalUnreadCount}
            initialNotifications={mergedNotifications}
            sidebarProps={{
              activeModules: activeModuleSlugs,
              organizations: userOrganizations,
              isSuperAdmin: user?.isSuperAdmin ?? false,
              credits: {
                available: creditBalance.available,
                monthlyLimit: creditBalance.monthlyLimit,
                orgSlug,
              },
            }}
          />
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
      <DashboardTourTrigger />
      {userRole === 'OWNER' && !profileCompleted && <WelcomeSurveyModal />}
    </div>
  )
}

export default MainLayout
