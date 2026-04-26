import Link from 'next/link'
import { Card, CardContent } from '@/_components/ui/card'
import { HOME_DATA } from '../_data/home-data'
import type { ModuleSlug } from '@/_data-access/module/types'

interface QuickAccessGridProps {
  orgSlug: string
  activeModules: ModuleSlug[]
}

const QuickAccessGrid = ({ orgSlug, activeModules }: QuickAccessGridProps) => {
  const visibleItems = HOME_DATA.quickAccess.filter(
    (item) => item.requiredModule === 'always' || activeModules.includes(item.requiredModule as ModuleSlug),
  )

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {visibleItems.map((item) => {
        const Icon = item.icon
        const href = `/org/${orgSlug}${item.href}`

        return (
          <Link key={item.id} href={href}>
            <Card className="h-full cursor-pointer border hover:border-primary/50 transition-colors">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm leading-tight">{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

export default QuickAccessGrid
