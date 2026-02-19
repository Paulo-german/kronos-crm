'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import type { PlanType } from '@/_lib/rbac/plan-limits'
import type { QuotaSummary } from '@/_data-access/billing/get-all-quotas'
import { QuotaUsageCard } from './quota-usage-card'
import { PlansGrid } from './plans-grid'
import { ComparisonTable } from './comparison-table'
import { PlansFaq } from './plans-faq'
import { InvoiceHistory } from './invoice-history'

interface BillingTabsProps {
  plan: PlanType | null
  quotas: QuotaSummary
  isOnTrial: boolean
  orgSlug: string
}

const TAB_CONFIG = {
  plans: {
    title: 'Planos e Preços',
    description: 'Escolha o plano ideal para sua equipe.',
  },
  invoices: {
    title: 'Histórico de Faturas',
    description: 'Visualize e baixe suas faturas anteriores.',
  },
} as const

type TabValue = keyof typeof TAB_CONFIG

export function BillingTabs({ plan, quotas, isOnTrial, orgSlug }: BillingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('plans')

  const { title, description } = TAB_CONFIG[activeTab]

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
      <TabsList className="grid h-12 w-full grid-cols-2 rounded-md border border-border/50 bg-tab/30">
        <TabsTrigger
          value="plans"
          className="rounded-md py-2 data-[state=active]:bg-card/80"
        >
          Planos
        </TabsTrigger>
        <TabsTrigger
          value="invoices"
          className="rounded-md py-2 data-[state=active]:bg-card/80"
        >
          Faturas
        </TabsTrigger>
      </TabsList>

      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <TabsContent value="plans" className="mt-6 space-y-12">
        <QuotaUsageCard quotas={quotas} />
        <PlansGrid currentPlan={plan} orgSlug={orgSlug} isOnTrial={isOnTrial} />
        <ComparisonTable />
        <PlansFaq />
      </TabsContent>

      <TabsContent value="invoices" className="mt-6">
        <InvoiceHistory />
      </TabsContent>
    </Tabs>
  )
}
