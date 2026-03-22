import Header, {
  HeaderLeft,
  HeaderSubTitle,
  HeaderTitle,
} from '@/_components/header'
import { Skeleton } from '@/_components/ui/skeleton'

const AiAgentLoading = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Header>
        <HeaderLeft>
          <HeaderTitle>Agentes IA</HeaderTitle>
          <HeaderSubTitle>
            Gerencie seus agentes de inteligência artificial.
          </HeaderSubTitle>
          <Skeleton className="h-4 w-32" />
        </HeaderLeft>
      </Header>

      {/* Card grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[180px] flex-col gap-3 rounded-xl border p-5"
          >
            {/* Status toggle row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-8 rounded-full" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-6 w-6" />
            </div>
            {/* Name + badge */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            {/* Stats row */}
            <div className="mt-auto flex items-center gap-4 border-t pt-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AiAgentLoading
