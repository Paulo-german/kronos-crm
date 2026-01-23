import { createClient } from '@/_lib/supabase/server'
import { getTasks } from '@/_data-access/task/get-tasks'
import { getDealsOptions } from '@/_data-access/deal/get-deals-options'
import TasksDataTable from '@/(authenticated)/tasks/_components/tasks-data-table'
import CreateTaskButton from '@/(authenticated)/tasks/_components/create-task-button'

const TasksPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const tasks = await getTasks(user.id)
  const dealOptions = await getDealsOptions(user.id)

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
