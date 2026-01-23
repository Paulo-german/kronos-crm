import { createClient } from '@/_lib/supabase/server'
import { getTasks } from '@/_data-access/task/get-tasks'
import { TasksDataTable } from '@/(authenticated)/tasks/_components/tasks-data-table'
import CreateTaskButton from '@/(authenticated)/tasks/_components/create-task-button'

const TasksPage = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const tasks = await getTasks(user.id)

  // Opcional: Aqui poderíamos filtrar "Vencidas" e "Hoje" se quiséssemos passar dados pré-filtrados
  // mas o DataTable também pode ter filtros. Por enquanto seguiremos o padrão Products.

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie suas tarefas e pendências ("Getting Things Done").
          </p>
        </div>
        <CreateTaskButton />
      </div>
      <TasksDataTable tasks={tasks} />
    </div>
  )
}

export default TasksPage
