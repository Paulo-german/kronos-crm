import Link from 'next/link'

interface DashboardGreetingProps {
  userName: string
  overdueTasks: number
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function DashboardGreeting({ userName, overdueTasks }: DashboardGreetingProps) {
  const greeting = getGreeting()
  const firstName = userName.split(' ')[0]

  return (
    <div className="flex flex-col gap-0.5">
      <h1 className="text-2xl font-bold tracking-tight">
        {greeting}, {firstName}
      </h1>
      <p className="text-sm text-muted-foreground">
        {overdueTasks > 0 ? (
          <>
            Você tem{' '}
            <Link
              href="../../crm/tasks"
              className="font-semibold text-destructive hover:underline"
            >
              {overdueTasks} tarefa{overdueTasks > 1 ? 's' : ''} atrasada{overdueTasks > 1 ? 's' : ''}
            </Link>
            {' '}pendente{overdueTasks > 1 ? 's' : ''}
          </>
        ) : (
          'Todas as tarefas em dia'
        )}
      </p>
    </div>
  )
}
