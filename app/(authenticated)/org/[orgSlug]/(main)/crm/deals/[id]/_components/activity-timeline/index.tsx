'use client'

import { useMemo, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import type { DealActivityDto } from '@/_data-access/deal/get-deal-details'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import { getActivities } from '@/_actions/deal/get-activities'
import { MANUAL_ACTIVITY_CONFIG, type ManualActivityType } from '@/_lib/deal/activity-config'
import { ActivityItem } from './activity-item'
import { CreateActivityDialog } from '../create-activity-dialog'

interface ActivityTimelineProps {
  dealId: string
  activities: DealActivityDto[]
  totalActivities: number
}

const LOAD_MORE_COUNT = 10

const ActivityTimeline = ({
  dealId,
  activities: initialActivities,
  totalActivities,
}: ActivityTimelineProps) => {
  const [selectedType, setSelectedType] = useState<ManualActivityType>('note')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [extraActivities, setExtraActivities] = useState<DealActivityDto[]>([])
  const [prevInitialIds, setPrevInitialIds] = useState(() =>
    initialActivities.map((a) => a.id).join(','),
  )

  const currentInitialIds = initialActivities.map((a) => a.id).join(',')
  if (currentInitialIds !== prevInitialIds) {
    setPrevInitialIds(currentInitialIds)
    setExtraActivities([])
  }

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
    execute({ dealId, offset: activities.length, limit: LOAD_MORE_COUNT })
  }

  const handleOpenWithType = (type: ManualActivityType) => {
    setSelectedType(type)
    setIsCreateOpen(true)
  }

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader className="px-0 pb-3">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">
              Histórico de Atividades
            </CardTitle>
            {totalActivities > 0 && (
              <span className="text-xs text-muted-foreground">{totalActivities}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {(
              Object.entries(MANUAL_ACTIVITY_CONFIG) as [
                ManualActivityType,
                (typeof MANUAL_ACTIVITY_CONFIG)[ManualActivityType],
              ][]
            ).map(([type, config]) => {
              const Icon = config.icon
              return (
                <Tooltip key={type}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 border-kronos-blue/40 text-kronos-blue hover:bg-kronos-blue/10 hover:text-kronos-blue"
                      onClick={() => handleOpenWithType(type)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.label}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Nenhuma atividade registrada</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}

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

      <CreateActivityDialog
        dealId={dealId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        initialType={selectedType}
      />
    </Card>
  )
}

export default ActivityTimeline
