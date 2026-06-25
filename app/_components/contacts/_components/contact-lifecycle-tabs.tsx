'use client'

import { LifecycleStage } from '@prisma/client'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Badge } from '@/_components/ui/badge'
import {
  LIFECYCLE_STAGE_CONFIG,
  LIFECYCLE_STAGE_ORDER,
} from '@/_lib/lifecycle/lifecycle-stage-config'
import type { ContactsLifecycleCounts } from '@/_data-access/contact/get-contacts-lifecycle-counts'
import { useContactFilters } from '../_lib/use-contact-filters'

export type { ContactsLifecycleCounts }

interface ContactLifecycleTabsProps {
  counts: ContactsLifecycleCounts
}

export function ContactLifecycleTabs({ counts }: ContactLifecycleTabsProps) {
  const { filters, setFilters } = useContactFilters()

  const activeTab =
    filters.lifecycleStages.length === 1 ? filters.lifecycleStages[0] : 'all'

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      setFilters({ lifecycleStages: [] })
      return
    }
    setFilters({ lifecycleStages: [value as LifecycleStage] })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange}>
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="all">
          Todos
          <Badge className="flex h-4 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground hover:bg-muted">
            {counts.total}
          </Badge>
        </TabsTrigger>
        {LIFECYCLE_STAGE_ORDER.map((stage) => {
          const cfg = LIFECYCLE_STAGE_CONFIG[stage]
          return (
            <TabsTrigger key={stage} value={stage}>
              <cfg.icon className={`size-4 ${cfg.colorClassName}`} />
              <span className="hidden sm:inline">{cfg.label}</span>
              <Badge className="flex h-4 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground hover:bg-muted">
                {counts[stage]}
              </Badge>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
