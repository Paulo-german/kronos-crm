import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import type { RecentActivity } from '@/_data-access/dashboard'
import {
  getActivityIcon,
  getActivityLabel,
  formatRelativeTime,
} from '@/_utils/activity-helpers'

interface RecentActivityListProps {
  activities: RecentActivity[]
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma atividade recente
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = getActivityIcon(activity.type)
        const initials = activity.performerName
          ?.split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        return (
          <div key={activity.id} className="flex items-start gap-3">
            <Avatar className="size-7">
              {activity.performerAvatar && (
                <AvatarImage src={activity.performerAvatar} />
              )}
              <AvatarFallback className="text-[10px]">
                {initials ?? <Icon className="size-3" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-medium">
                  {getActivityLabel(activity.type)}
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  em {activity.dealTitle}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(activity.createdAt)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
