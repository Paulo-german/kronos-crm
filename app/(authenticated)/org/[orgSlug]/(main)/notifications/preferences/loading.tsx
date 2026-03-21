import { Skeleton } from '@/_components/ui/skeleton'

const NotificationPreferencesLoading = () => {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* In-app preferences card skeleton */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index}>
            {index > 0 && <div className="border-t my-4" />}
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Other channels card skeleton */}
      <div className="rounded-lg border p-6 space-y-4 opacity-60">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index}>
            {index > 0 && <div className="border-t my-4" />}
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Save button skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-9 w-40" />
      </div>
    </div>
  )
}

export default NotificationPreferencesLoading
