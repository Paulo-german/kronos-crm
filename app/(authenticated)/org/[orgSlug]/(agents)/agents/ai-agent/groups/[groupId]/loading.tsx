import { Skeleton } from '@/_components/ui/skeleton'

export default function AgentGroupDetailLoading() {
  return (
    <div className="flex flex-1 min-h-0 bg-background">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* Botão voltar */}
        <Skeleton className="h-8 w-24 rounded-md" />

        {/* Header: título + switch + stats */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Grid 2x2 de cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/50 bg-card">
              {/* Card header */}
              <div className="border-b p-6">
                <Skeleton className="mb-1.5 h-5 w-32" />
                <Skeleton className="h-3.5 w-56" />
              </div>
              {/* Card body */}
              <div className="space-y-3 p-6">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-9 w-20 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
