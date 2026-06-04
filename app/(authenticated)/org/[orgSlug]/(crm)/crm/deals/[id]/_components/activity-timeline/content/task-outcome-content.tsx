import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { TASK_OUTCOME_OPTIONS } from '@/_lib/task/outcome-config'

interface TaskOutcomeContentProps {
  taskTitle: string | undefined
  outcomeType: string | undefined
  outcomeLabel: string
  notes: string | null
}

function isPositiveOutcome(outcomeValue: string): boolean {
  return (
    Object.values(TASK_OUTCOME_OPTIONS)
      .flat()
      .find((opt) => opt.value === outcomeValue)?.positive ?? true
  )
}

export function TaskOutcomeContent({
  taskTitle,
  outcomeType,
  outcomeLabel,
  notes,
}: TaskOutcomeContentProps) {
  const isPositive = outcomeType ? isPositiveOutcome(outcomeType) : true

  return (
    <div className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5">
      {taskTitle && (
        <>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/50">
            Tarefa
          </span>
          <span className="text-sm text-foreground/80">{taskTitle}</span>
        </>
      )}

      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/50">
        Resultado
      </span>
      <div>
        <Badge
          variant="secondary"
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium',
            isPositive
              ? 'border-kronos-green/30 bg-kronos-green/15 text-kronos-green'
              : 'bg-muted/60 text-muted-foreground',
          )}
        >
          {isPositive ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {outcomeLabel}
        </Badge>
      </div>

      {notes && (
        <>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/50">
            Anotação
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">{notes}</p>
        </>
      )}
    </div>
  )
}
