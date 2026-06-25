import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTasks } from '@/_data-access/crm-task/get-tasks'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import { TaskOutcomeIntroTrigger } from '@/_components/tutorials/task-outcome-intro-trigger'
import { TasksListClient } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/tasks/_components/tasks-list-client'

interface TasksPageProps {
  params: Promise<{ orgSlug: string }>
}

const TasksPage = async ({ params }: TasksPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [tasks, members, completedTutorialIds] = await Promise.all([
    getTasks(ctx),
    getOrganizationMembers(ctx.orgId),
    getTutorialCompletions(ctx.userId, ctx.orgId),
  ])

  const acceptedMembers = members.accepted
    .filter((member) => member.userId && member.user?.fullName)
    .map((member) => ({
      userId: member.userId!,
      name: member.user!.fullName!,
    }))

  return (
    <>
      <TasksListClient
        tasks={tasks}
        members={acceptedMembers}
        currentUserId={ctx.userId}
        userRole={ctx.userRole}
      />
      <TaskOutcomeIntroTrigger
        hasSeenTaskOutcomeIntro={completedTutorialIds.includes(
          'task-outcome-intro',
        )}
      />
    </>
  )
}

export default TasksPage
