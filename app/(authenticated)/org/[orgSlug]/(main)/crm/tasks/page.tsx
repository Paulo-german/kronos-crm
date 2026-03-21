import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTasks } from '@/_data-access/task/get-tasks'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import TasksDataTable from './_components/tasks-data-table'
import CreateTaskButton from './_components/create-task-button'

interface TasksPageProps {
  params: Promise<{ orgSlug: string }>
}

const TasksPage = async ({ params }: TasksPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [tasks, dealOptions] = await Promise.all([
    getTasks(ctx),
    getDealsOptions(ctx),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <CreateTaskButton dealOptions={dealOptions} />
      </div>
      <TasksDataTable tasks={tasks} dealOptions={dealOptions} />
    </div>
  )
}

export default TasksPage
