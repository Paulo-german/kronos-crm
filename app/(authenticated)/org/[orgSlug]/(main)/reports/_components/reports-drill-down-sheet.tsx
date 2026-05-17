'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { Skeleton } from '@/_components/ui/skeleton'
import { useDrillDownState } from '../_hooks/use-drill-down-state'

function resolveDrillTitle(drillKpi: string): string {
  if (drillKpi === 'kpi-revenue') return 'Receita total'
  if (drillKpi === 'kpi-deals') return 'Novos leads'
  if (drillKpi === 'kpi-ticket') return 'Ticket médio'
  if (drillKpi === 'kpi-pipeline') return 'Valor do pipeline'
  if (drillKpi.startsWith('anchor-channel:')) {
    const channel = drillKpi.replace('anchor-channel:', '')
    const labels: Record<string, string> = {
      WHATSAPP: 'Canal: WhatsApp',
      INSTAGRAM: 'Canal: Instagram',
      FACEBOOK: 'Canal: Facebook',
      EMAIL: 'Canal: E-mail',
      WEBCHAT: 'Canal: Webchat',
    }
    return labels[channel] ?? `Canal: ${channel}`
  }
  return drillKpi
}

export function ReportsDrillDownSheet() {
  const { drillKpi, isOpen, closeDrill } = useDrillDownState()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeDrill() }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader className="border-b border-border/40 pb-4">
          <SheetTitle>
            {drillKpi ? resolveDrillTitle(drillKpi) : 'Detalhes'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {drillKpi ? (
            <DrillDownBody drillKpi={drillKpi} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DrillDownBody({ drillKpi }: { drillKpi: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Detalhamento disponível em breve
      </div>
    </div>
  )
}
