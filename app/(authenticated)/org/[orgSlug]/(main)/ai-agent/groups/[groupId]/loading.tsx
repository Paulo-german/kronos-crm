import Header, { HeaderLeft, HeaderRight } from '@/_components/header'
import { Skeleton } from '@/_components/ui/skeleton'

const GroupDetailLoading = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Header>
        <HeaderLeft>
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64" />
        </HeaderLeft>
        <HeaderRight>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </HeaderRight>
      </Header>

      {/* Grid de 4 cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card Configuracao */}
        <div className="rounded-xl border border-border/50 bg-secondary/20">
          <div className="space-y-1.5 p-6 pb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="space-y-4 p-6 pt-0">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>

        {/* Card Router */}
        <div className="rounded-xl border border-border/50 bg-secondary/20">
          <div className="space-y-1.5 p-6 pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-4 p-6 pt-0">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          </div>
        </div>

        {/* Card Membros */}
        <div className="rounded-xl border border-border/50 bg-secondary/20">
          <div className="flex items-center justify-between p-6 pb-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-3 p-6 pt-0">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-6 w-6" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Inboxes */}
        <div className="rounded-xl border border-border/50 bg-secondary/20">
          <div className="space-y-1.5 p-6 pb-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="space-y-2 p-6 pt-0">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupDetailLoading
