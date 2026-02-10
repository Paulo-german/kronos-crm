import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTasks } from '@/_data-access/task/get-tasks'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import TasksDataTable from './_components/tasks-data-table'
import CreateTaskButton from './_components/create-task-button'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'

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
      <Header>
        <HeaderLeft>
          <HeaderTitle>Tarefas</HeaderTitle>
          <HeaderSubTitle>Gerencie suas tarefas e pendências</HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateTaskButton dealOptions={dealOptions} />
        </HeaderRight>
      </Header>
      <TasksDataTable tasks={tasks} dealOptions={dealOptions} />
    </div>
  )
}

export default TasksPage
