import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getResourceTypeLabel } from '@/_lib/notifications/notification-variant'

interface AssignmentActionsProps {
  actionUrl: string | null
  resourceType: string | null
}

export const AssignmentActions = ({ actionUrl, resourceType }: AssignmentActionsProps) => {
  if (!actionUrl) return null

  const label = getResourceTypeLabel(resourceType)

  return (
    <div className="mt-3">
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-3 text-xs"
        asChild
        onClick={(event) => event.stopPropagation()}
      >
        <Link href={actionUrl}>
          <ExternalLink className="size-3" />
          Ver {label}
        </Link>
      </Button>
    </div>
  )
}
