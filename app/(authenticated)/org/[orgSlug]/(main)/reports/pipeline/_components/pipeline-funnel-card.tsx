import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { PipelineFunnel } from '@/(authenticated)/org/[orgSlug]/(main)/dashboard/_components/pipeline-funnel'
import type { FunnelData } from '@/_data-access/dashboard/types'

interface PipelineFunnelCardProps {
  data: FunnelData
}

export function PipelineFunnelCard({ data }: PipelineFunnelCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <PipelineFunnel
          stages={data.stages}
          totalDeals={data.totalDeals}
          wonDeals={data.wonDeals}
        />
      </CardContent>
    </Card>
  )
}
