'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'

interface DashboardTabsProps {
  activeTab: string
}

export function DashboardTabs({ activeTab }: DashboardTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`?${params.toString()}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="grid h-12 w-full grid-cols-3 rounded-md border border-border/50 bg-tab">
        <TabsTrigger value="reports" className="py-2">
          Relatórios
        </TabsTrigger>
        <TabsTrigger value="inbox" className="py-2">
          Inbox
        </TabsTrigger>
        <TabsTrigger value="ai" className="py-2">
          IA
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
