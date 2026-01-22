'use client'

import {
  Phone,
  Mail,
  FileText,
  Users,
  ArrowRightLeft,
  Package,
  PackageMinus,
  ListTodo,
  CheckCircle2,
  Trophy,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'

interface ActivityTimelineProps {
  deal: DealDetailsDto
}

const activityConfig: Record<
  string,
  { icon: typeof FileText; label: string; color: string }
> = {
  // Manuais
  note: { icon: FileText, label: 'Nota', color: 'text-blue-500' },
  call: { icon: Phone, label: 'Ligação', color: 'text-green-500' },
  email: { icon: Mail, label: 'Email', color: 'text-purple-500' },
  meeting: { icon: Users, label: 'Reunião', color: 'text-orange-500' },
  // Sistema
  stage_change: {
    icon: ArrowRightLeft,
    label: 'Mudança de Etapa',
    color: 'text-primary',
  },
  product_added: {
    icon: Package,
    label: 'Produto Adicionado',
    color: 'text-[#00b37e]',
  },
  product_removed: {
    icon: PackageMinus,
    label: 'Produto Removido',
    color: 'text-destructive',
  },
  task_created: {
    icon: ListTodo,
    label: 'Tarefa Criada',
    color: 'text-amber-500',
  },
  task_completed: {
    icon: CheckCircle2,
    label: 'Tarefa Concluída',
    color: 'text-[#00b37e]',
  },
  deal_won: {
    icon: Trophy,
    label: 'Negócio Ganho',
    color: 'text-yellow-500',
  },
  deal_lost: {
    icon: XCircle,
    label: 'Negócio Perdido',
    color: 'text-red-500',
  },
  deal_reopened: {
    icon: RotateCcw,
    label: 'Negócio Reaberto',
    color: 'text-blue-400',
  },
}

const ActivityTimeline = ({ deal }: ActivityTimelineProps) => {
  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  return (
    <Card className="border-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Histórico de Atividades
        </CardTitle>
      </CardHeader>

      <CardContent>
        {deal.activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">
              Nenhuma atividade registrada
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {deal.activities.map((activity) => {
              const config =
                activityConfig[activity.type] || activityConfig.note
              const Icon = config.icon
              return (
                <div
                  key={activity.id}
                  className="relative flex gap-4 border-l-2 border-border pl-4 transition-all hover:border-primary/50"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted ring-4 ring-background`}
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {activity.content}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityTimeline
