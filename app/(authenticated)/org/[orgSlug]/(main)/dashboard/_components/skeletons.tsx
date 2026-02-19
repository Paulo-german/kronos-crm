import { Card, CardContent, CardHeader } from '@/_components/ui/card'
import { Skeleton } from '@/_components/ui/skeleton'

export function KpiGridSkeleton() {
  return (
    <div className="grid h-full grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="flex h-full flex-col">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="mt-3 h-7 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PipelineStatusSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Skeleton className="size-[160px] rounded-full" />
      </CardContent>
    </Card>
  )
}

export function ChartsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="mt-4 h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

