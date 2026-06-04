import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDealDetails } from '@/_data-access/deal/get-deal-details'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getDealLostReasons } from '@/_data-access/settings/get-lost-reasons'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import DealDetailClient from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/[id]/_components/deal-detail-client'
import ContactWidgetServer from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/[id]/_components/contact-widget-server'
import TabProductsServer from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/[id]/_components/tab-products-server'
import TabTasksServer from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/[id]/_components/tab-tasks-server'
import TabAppointmentsServer from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/[id]/_components/tab-appointments-server'
import { DealDetailIntroTrigger } from '@/_components/tutorials/deal-detail-intro-trigger'
import {
  ContactWidgetSkeleton,
  TabProductsSkeleton,
  TabTasksSkeleton,
  TabAppointmentsSkeleton,
} from '@/(authenticated)/org/[orgSlug]/(crm)/crm/deals/[id]/_components/skeletons'

interface DealDetailPageProps {
  params: Promise<{ id: string; orgSlug: string }>
}

const DealDetailPage = async ({ params }: DealDetailPageProps) => {
  const { id, orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const deal = await getDealDetails(id, ctx)
  if (!deal) {
    redirect(`/org/${orgSlug}/crm/deals/pipeline`)
  }

  const [members, lostReasons, completedTutorialIds] = await Promise.all([
    getOrganizationMembers(ctx.orgId),
    getDealLostReasons(ctx.orgId),
    getTutorialCompletions(ctx.userId, ctx.orgId),
  ])

  return (
    <div className="h-full w-full">
      <DealDetailIntroTrigger
        hasSeenDealDetailIntro={completedTutorialIds.includes('deal-details')}
      />
      <DealDetailClient
        deal={deal}
        members={members.accepted}
        currentUserId={ctx.userId}
        userRole={ctx.userRole}
        lostReasons={lostReasons}
        orgSlug={orgSlug}
        contactsSlot={
          <Suspense fallback={<ContactWidgetSkeleton />}>
            <ContactWidgetServer deal={deal} ctx={ctx} />
          </Suspense>
        }
        productsTabSlot={
          <Suspense fallback={<TabProductsSkeleton />}>
            <TabProductsServer deal={deal} orgId={ctx.orgId} />
          </Suspense>
        }
        tasksTabSlot={
          <Suspense fallback={<TabTasksSkeleton />}>
            <TabTasksServer deal={deal} />
          </Suspense>
        }
        appointmentsTabSlot={
          <Suspense fallback={<TabAppointmentsSkeleton />}>
            <TabAppointmentsServer
              deal={deal}
              ctx={ctx}
              members={members.accepted}
            />
          </Suspense>
        }
      />
    </div>
  )
}

export default DealDetailPage
