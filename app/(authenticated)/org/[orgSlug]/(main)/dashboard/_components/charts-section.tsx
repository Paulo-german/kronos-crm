import type { MemberRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { getRevenueOverTime, getFunnelData } from '@/_data-access/dashboard'
import { RevenueAreaChart } from './revenue-area-chart'
import { FunnelBarChart } from './funnel-bar-chart'

interface ChartsSectionProps {
  ctx: { userId: string; orgId: string; userRole: MemberRole }
}

export async function ChartsSection({ ctx }: ChartsSectionProps) {
  const [revenueData, funnelData] = await Promise.all([
    getRevenueOverTime(ctx),
    getFunnelData(ctx),
  ])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Visão Geral</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-md border border-border/50 bg-tab/30">
            <TabsTrigger
              value="revenue"
              className="rounded-md py-2 data-[state=active]:bg-card/80"
            >
              Receita
            </TabsTrigger>
            <TabsTrigger
              value="funnel"
              className="rounded-md py-2 data-[state=active]:bg-card/80"
            >
              Funil
            </TabsTrigger>
          </TabsList>
          <TabsContent value="revenue" className="mt-4">
            <RevenueAreaChart data={revenueData} />
          </TabsContent>
          <TabsContent value="funnel" className="mt-4">
            <FunnelBarChart data={funnelData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
