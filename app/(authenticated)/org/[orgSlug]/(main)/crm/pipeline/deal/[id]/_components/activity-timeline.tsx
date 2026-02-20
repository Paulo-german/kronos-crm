'use client'

import { useMemo, useState } from 'react'
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
  PackageCheck,
  UserCog,
  Flag,
  PauseCircle,
  PlayCircle,
  CalendarClock,
  UserPlus,
  UserMinus,
  User2Icon,
  Loader2,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import type { DealActivityDto } from '@/_data-access/deal/get-deal-details'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { getActivities } from '@/_actions/deal/get-activities'

interface ActivityTimelineProps {
  dealId: string
  activities: DealActivityDto[]
  totalActivities: number
}

const activityConfig: Record<
  string,
  { icon: typeof FileText; label: string; color: string; bgColor: string }
> = {
  // Manuais
  note: {
    icon: FileText,
    label: 'Nota',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  call: {
    icon: Phone,
    label: 'Ligação',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  meeting: {
    icon: Users,
    label: 'Reunião',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  // Sistema
  stage_change: {
    icon: ArrowRightLeft,
    label: 'Mudança de Etapa',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  product_added: {
    icon: Package,
    label: 'Produto Adicionado',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  product_removed: {
    icon: PackageMinus,
    label: 'Produto Removido',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  task_created: {
    icon: ListTodo,
    label: 'Tarefa Criada',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  task_completed: {
    icon: CheckCircle2,
    label: 'Tarefa Concluída',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  deal_won: {
    icon: Trophy,
    label: 'Negócio Ganho',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  deal_lost: {
    icon: XCircle,
    label: 'Negócio Perdido',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  deal_reopened: {
    icon: RotateCcw,
    label: 'Negócio Reaberto',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  product_updated: {
    icon: PackageCheck,
    label: 'Produto Atualizado',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  assignee_changed: {
    icon: UserCog,
    label: 'Responsável Alterado',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  priority_changed: {
    icon: Flag,
    label: 'Prioridade Alterada',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  deal_paused: {
    icon: PauseCircle,
    label: 'Negócio Pausado',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
  deal_unpaused: {
    icon: PlayCircle,
    label: 'Negócio Retomado',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  date_changed: {
    icon: CalendarClock,
    label: 'Previsão Alterada',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  contact_added: {
    icon: UserPlus,
    label: 'Contato Adicionado',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  contact_removed: {
    icon: UserMinus,
    label: 'Contato Removido',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
}

const LOAD_MORE_COUNT = 10

const ActivityTimeline = ({
  dealId,
  activities: initialActivities,
  totalActivities,
}: ActivityTimelineProps) => {
  const [extraActivities, setExtraActivities] = useState<DealActivityDto[]>([])
  const [prevInitialIds, setPrevInitialIds] = useState(() =>
    initialActivities.map((a) => a.id).join(','),
  )

  // Reseta atividades extras quando o servidor revalida (nova atividade criada)
  const currentInitialIds = initialActivities.map((a) => a.id).join(',')
  if (currentInitialIds !== prevInitialIds) {
    setPrevInitialIds(currentInitialIds)
    setExtraActivities([])
  }

  // Combina server + client-loaded, deduplicando por ID
  const activities = useMemo(() => {
    const seen = new Set(initialActivities.map((a) => a.id))
    const result = [...initialActivities]
    for (const a of extraActivities) {
      if (!seen.has(a.id)) {
        seen.add(a.id)
        result.push(a)
      }
    }
    return result
  }, [initialActivities, extraActivities])

  const hasMore = activities.length < totalActivities

  const { execute, isPending } = useAction(getActivities, {
    onSuccess: ({ data }) => {
      if (data && data.length > 0) {
        setExtraActivities((prev) => [...prev, ...data])
      }
    },
  })

  const handleLoadMore = () => {
    execute({
      dealId,
      offset: activities.length,
      limit: LOAD_MORE_COUNT,
    })
  }

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
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader className="px-0 pb-3">
        <div className="mb-4 flex items-center gap-2">
          <CardTitle className="text-base font-semibold">
            Histórico de Atividades
          </CardTitle>
          {totalActivities > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalActivities}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {activities.length === 0 ? (
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
            {activities.map((activity) => {
              const config =
                activityConfig[activity.type] || activityConfig.note
              const Icon = config.icon

              return (
                <div
                  key={activity.id}
                  className="relative flex gap-4 border-l-2 border-border pl-4 transition-all hover:border-primary/50"
                >
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ring-background ${config.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-foreground">
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(activity.createdAt)}
                        </span>
                      </div>

                      {activity.performer && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="secondary"
                              className="flex items-center gap-2 rounded-full bg-secondary/40 px-2.5 py-1.5 text-xs font-normal hover:bg-secondary/30"
                            >
                              <User2Icon size={14} className="text-primary" />
                              {activity.performer.fullName}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {activity.performer.fullName} realizou essa
                              atividade
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {activity.content}
                    </p>
                  </div>
                </div>
              )
            })}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    `Carregar mais (${totalActivities - activities.length} restantes)`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityTimeline
