import { Skeleton } from '@/_components/ui/skeleton'
import { Card, CardContent } from '@/_components/ui/card'

function SkeletonCard() {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="flex flex-col gap-4 p-3.5">
        {/* Badge de status */}
        <Skeleton className="h-6 w-24" />
        {/* Título */}
        <Skeleton className="h-5 w-4/5" />
        {/* Avatar + valor + prioridade */}
        <div className="flex gap-4">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonColumn({ cards }: { cards: number }) {
  return (
    <div className="flex h-full w-96 shrink-0 flex-col rounded-md border bg-muted/30">
      {/* Column header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-8 rounded-sm" />
        </div>
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
      {/* Cards */}
      <div className="flex-1 space-y-2 p-2">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

export default function PipelineLoading() {
  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      {/* Toolbar: sort + filter + add button */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-[180px] rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>

      {/* Kanban columns */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        <SkeletonColumn cards={3} />
        <SkeletonColumn cards={2} />
        <SkeletonColumn cards={3} />
        <SkeletonColumn cards={1} />
      </div>
    </div>
  )
}
