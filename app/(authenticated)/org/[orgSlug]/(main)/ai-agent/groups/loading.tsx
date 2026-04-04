import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Badge } from '@/_components/ui/badge'
import { Skeleton } from '@/_components/ui/skeleton'

const GroupsLoading = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Header>
        <HeaderLeft>
          <HeaderTitle>
            Equipes de Agentes
            <Badge variant="outline" className="ml-2 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Beta
            </Badge>
          </HeaderTitle>
          <HeaderSubTitle>
            Organize agentes em equipes com roteamento inteligente de conversas.
          </HeaderSubTitle>
          <Skeleton className="h-4 w-32" />
        </HeaderLeft>
      </Header>

      {/* Card list skeleton */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/50 bg-card p-5"
          >
            {/* Header: badge + name + dropdown */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>

            {/* Footer: avatars + stats */}
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <div className="flex -space-x-2">
                {Array.from({ length: 3 }).map((_, avatarIndex) => (
                  <Skeleton
                    key={avatarIndex}
                    className="h-7 w-7 rounded-full border-2 border-background"
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-8" />
                <Skeleton className="h-3.5 w-8" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GroupsLoading
