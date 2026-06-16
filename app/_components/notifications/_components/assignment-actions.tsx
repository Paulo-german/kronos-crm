import { ExternalLink } from 'lucide-react'
import { NotificationAction } from '../notification/notification-action'
import { getResourceTypeLabel } from '@/_lib/notifications/notification-variant'

interface AssignmentActionsProps {
  actionUrl: string | null
  resourceType: string | null
}

export const AssignmentActions = ({
  actionUrl,
  resourceType,
}: AssignmentActionsProps) => {
  if (!actionUrl) return null

  const label = getResourceTypeLabel(resourceType)

  return (
    <div className="mt-3">
      <NotificationAction
        label={`Ver ${label}`}
        icon={ExternalLink}
        href={actionUrl}
      />
    </div>
  )
}
