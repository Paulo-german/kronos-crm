import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface AlertActionsProps {
  actionUrl: string | null
}

export const AlertActions = ({ actionUrl }: AlertActionsProps) => {
  if (!actionUrl) return null

  return (
    <div className="mt-3">
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 border-amber-500/40 px-3 text-xs text-amber-600 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/30"
        asChild
        onClick={(event) => event.stopPropagation()}
      >
        <Link href={actionUrl}>
          <Wrench className="size-3" />
          Resolver
        </Link>
      </Button>
    </div>
  )
}
