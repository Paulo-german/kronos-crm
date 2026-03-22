import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTasks } from '@/_data-access/task/get-tasks'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { TasksListClient } from './_components/tasks-list-client'

interface TasksPageProps {
  params: Promise<{ orgSlug: string }>
}

const TasksPage = async ({ params }: TasksPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [tasks, dealOptions, members] = await Promise.all([
    getTasks(ctx),
    getDealsOptions(ctx),
    getOrganizationMembers(ctx.orgId),
  ])

  // Normaliza para um DTO simples (userId e fullName garantidos)
  const acceptedMembers = members.accepted
    .filter((member) => member.userId && member.user?.fullName)
    .map((member) => ({
      userId: member.userId!,
      name: member.user!.fullName!,
    }))

  return (
    <TasksListClient
      tasks={tasks}
      dealOptions={dealOptions}
      members={acceptedMembers}
      currentUserId={ctx.userId}
      userRole={ctx.userRole}
    />
  )
}

export default TasksPage
