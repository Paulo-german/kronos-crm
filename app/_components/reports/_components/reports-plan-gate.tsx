import { Button } from '@/_components/ui/button'
import { BarChart3, Lock } from 'lucide-react'
import Link from 'next/link'

interface ReportsPlanGateProps {
  orgSlug: string
}

export function ReportsPlanGate({ orgSlug }: ReportsPlanGateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Relatórios disponíveis no plano Essential</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Analise KPIs, métricas de pipeline, performance do time e muito mais. Disponível a partir do plano Essential.
        </p>
      </div>
      <Button asChild>
        <Link href={`/org/${orgSlug}/checkout/configure?plan=essential`}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Fazer upgrade
        </Link>
      </Button>
    </div>
  )
}
