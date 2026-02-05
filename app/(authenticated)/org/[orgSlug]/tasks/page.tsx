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

  // Passa o contexto RBAC completo
  const tasks = await getTasks(ctx)
  const dealOptions = await getDealsOptions(ctx)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie suas tarefas e pendências (&quot;Getting Things
            Done&quot;).
          </p>
        </div>
        <CreateTaskButton dealOptions={dealOptions} />
      </div>
      <TasksDataTable tasks={tasks} dealOptions={dealOptions} />
    </div>
  )
}

export default TasksPage
