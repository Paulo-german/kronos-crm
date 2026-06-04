'use client'

import { useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'
import type { GoalType, GoalScope } from '@prisma/client'
import { getGoalSuggestionAction } from '@/_actions/goal/get-suggestion'
import { Skeleton } from '@/_components/ui/skeleton'
import { Button } from '@/_components/ui/button'
import { Lightbulb } from 'lucide-react'

interface GoalSuggestionHintProps {
  type: GoalType
  scope: GoalScope
  targetUserId?: string | null
  targetPipelineId?: string | null
  onUseSuggestion: (value: number) => void
}

export function GoalSuggestionHint({
  type,
  scope,
  targetUserId,
  targetPipelineId,
  onUseSuggestion,
}: GoalSuggestionHintProps) {
  const { execute, result, isPending } = useAction(getGoalSuggestionAction)

  useEffect(() => {
    execute({ type, scope, targetUserId, targetPipelineId })
  }, [execute, type, scope, targetUserId, targetPipelineId])

  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    )
  }

  const suggestion = result.data

  if (!suggestion || !suggestion.hasEnoughData) {
    return null
  }

  const isRevenue = type === 'REVENUE'
  const formattedValue = isRevenue
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(suggestion.suggested)
    : new Intl.NumberFormat('pt-BR').format(Math.round(suggestion.suggested))

  return (
    <div className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/30 px-3 py-2">
      <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
      <p className="flex-1 text-xs text-muted-foreground">
        Sugestão baseada no histórico:{' '}
        <span className="font-medium text-foreground">{formattedValue}</span>
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => onUseSuggestion(suggestion.suggested)}
      >
        Usar sugestão
      </Button>
    </div>
  )
}
