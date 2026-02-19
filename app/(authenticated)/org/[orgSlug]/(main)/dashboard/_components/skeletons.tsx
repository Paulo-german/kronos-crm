import { Card, CardContent, CardHeader } from '@/_components/ui/card'
import { Skeleton } from '@/_components/ui/skeleton'

export function KpiGridSkeleton() {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="flex h-full w-full flex-col">
          <CardContent className="flex flex-1 flex-col justify-center p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="mt-2 flex items-end gap-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="mb-0.5 h-4 w-12" />
            </div>
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

