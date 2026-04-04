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
      <TabsList className="grid h-12 w-full grid-cols-2 rounded-md border border-border/50">
        <TabsTrigger
          value="reports"
          className="rounded-md py-2"
        >
          Relatórios
        </TabsTrigger>
        <TabsTrigger
          value="ai"
          className="rounded-md py-2"
        >
          IA
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
