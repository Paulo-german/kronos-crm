import { Skeleton } from '@/_components/ui/skeleton'

export default function ImportLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mx-2 h-px w-12" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mx-2 h-px w-12" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Card */}
      <div className="rounded-lg border p-8">
        <Skeleton className="mx-auto h-48 w-full max-w-md rounded-lg" />
      </div>
    </div>
  )
}
