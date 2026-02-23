import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getDealDetails } from '@/_data-access/deal/get-deal-details'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getDealLostReasons } from '@/_data-access/settings/get-lost-reasons'

import DealDetailClient from './_components/deal-detail-client'
import ContactWidgetServer from './_components/contact-widget-server'
import TabProductsServer from './_components/tab-products-server'
import TabTasksServer from './_components/tab-tasks-server'
import TabAppointmentsServer from './_components/tab-appointments-server'
import {
  ContactWidgetSkeleton,
  TabProductsSkeleton,
  TabTasksSkeleton,
  TabAppointmentsSkeleton,
} from './_components/skeletons'

interface DealPageProps {
  params: Promise<{ id: string; orgSlug: string }>
}

const DealPage = async ({ params }: DealPageProps) => {
  const { id, orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Critical path: dados necessários para header + resumo imediato
  const deal = await getDealDetails(id, ctx)
  if (!deal) {
    redirect(`/org/${orgSlug}/pipeline`)
  }

  // Queries leves necessárias para dialogs (transfer + lost)
  const [members, lostReasons] = await Promise.all([
    getOrganizationMembers(ctx.orgId),
    getDealLostReasons(ctx.orgId),
  ])

  return (
    <div className="h-full w-full">
      <DealDetailClient
        deal={deal}
        members={members.accepted}
        currentUserId={ctx.userId}
        userRole={ctx.userRole}
        lostReasons={lostReasons}
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
            <TabTasksServer deal={deal} ctx={ctx} />
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

export default DealPage
