import { User2Icon, Bot } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import type { DealActivityDto } from '@/_data-access/deal/get-deal-details'
import { MANUAL_ACTIVITY_CONFIG } from '@/_lib/deal/activity-config'
import { getActivityConfig, formatActivityDateTime } from './activity-config'
import { TaskOutcomeContent } from './content/task-outcome-content'
import { ManualContent } from './content/manual-content'
import { SystemContent } from './content/system-content'

const MANUAL_TYPES = new Set(Object.keys(MANUAL_ACTIVITY_CONFIG))

function parseOutcomeContent(content: string): { label: string; notes: string | null } {
  const separatorIndex = content.indexOf(' · ')
  if (separatorIndex < 0) return { label: content, notes: null }
  return {
    label: content.slice(0, separatorIndex),
    notes: content.slice(separatorIndex + 3),
  }
}

function resolveContent(activity: DealActivityDto) {
  const isTaskOutcome =
    !!activity.metadata?.taskId && activity.type !== 'task_completed'

  if (isTaskOutcome) {
    const { label, notes } = parseOutcomeContent(activity.content)
    return (
      <TaskOutcomeContent
        taskTitle={activity.metadata?.taskTitle as string | undefined}
        outcomeType={activity.metadata?.outcomeType as string | undefined}
        outcomeLabel={label}
        notes={notes}
      />
    )
  }

  if (MANUAL_TYPES.has(activity.type)) {
    return <ManualContent content={activity.content} />
  }

  return <SystemContent content={activity.content} />
}

interface ActivityItemProps {
  activity: DealActivityDto
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const config = getActivityConfig(activity.type)
  const Icon = config.icon

  return (
    <div className="relative flex gap-4 border-l-2 border-border pl-4 transition-all hover:border-primary/50">
      <div
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ring-background ${config.bgColor}`}
      >
        <Icon className={`h-5 w-5 ${config.color}`} />
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-foreground">{config.label}</span>
            <span className="text-xs text-muted-foreground">
              {formatActivityDateTime(activity.createdAt)}
            </span>
          </div>

          {activity.performer ? (
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
                <p>{activity.performer.fullName} realizou essa atividade</p>
              </TooltipContent>
            </Tooltip>
          ) : activity.metadata?.agentName ? (
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="secondary"
                  className="flex items-center gap-2 rounded-full bg-secondary/40 px-2.5 py-1.5 text-xs font-normal hover:bg-secondary/30"
                >
                  <Bot size={14} className="text-primary" />
                  {activity.metadata.agentName as string}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ação realizada pelo agente {activity.metadata.agentName as string}</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {resolveContent(activity)}
      </div>
    </div>
  )
}
