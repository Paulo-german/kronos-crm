import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/_components/ui/card'
import { Skeleton } from '@/_components/ui/skeleton'
import { Separator } from '@/_components/ui/separator'

const IntegrationCardSkeleton = () => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1">
      <Skeleton className="h-4 w-40" />
    </CardContent>
    <Separator />
    <CardFooter className="pt-4">
      <Skeleton className="h-9 w-44" />
    </CardFooter>
  </Card>
)

const IntegrationsLoading = () => (
  <div className="container mx-auto space-y-6 py-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-56" />
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <IntegrationCardSkeleton />
      <IntegrationCardSkeleton />
    </div>
  </div>
)

export default IntegrationsLoading
