import { Wrench } from 'lucide-react'
import { NotificationAction } from '../notification/notification-action'

interface AlertActionsProps {
  actionUrl: string | null
}

export const AlertActions = ({ actionUrl }: AlertActionsProps) => {
  if (!actionUrl) return null

  return (
    <div className="mt-3">
      <NotificationAction
        label="Resolver"
        icon={Wrench}
        href={actionUrl}
        className="border-amber-500/40 text-amber-600 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/30"
      />
    </div>
  )
}
