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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="reports">
          Relatórios
        </TabsTrigger>
        <TabsTrigger value="inbox">
          Inbox
        </TabsTrigger>
        <TabsTrigger value="ai">
          IA
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
