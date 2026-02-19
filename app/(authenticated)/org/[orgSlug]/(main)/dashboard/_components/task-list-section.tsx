import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { getPendingTasks } from '@/_data-access/dashboard'
import { TaskListItem } from './task-list-item'

interface TaskListSectionProps {
  ctx: { userId: string; orgId: string }
}

export async function TaskListSection({ ctx }: TaskListSectionProps) {
  const tasks = await getPendingTasks(ctx.orgId, ctx.userId)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Minhas Tarefas</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma tarefa pendente
          </p>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => (
              <TaskListItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
