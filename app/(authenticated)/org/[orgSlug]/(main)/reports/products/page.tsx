import { ReportsSectionHeader } from '../_components/reports-section-header'
import { Clock } from 'lucide-react'

export default function ProductsReportPage() {
  return (
    <div className="flex flex-col gap-6">
      <ReportsSectionHeader
        title="Produtos"
        description="Mix de vendas e receita por produto."
      />
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Em breve</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Mix de vendas, receita por produto e top produtos chegam em breve.
        </p>
      </div>
    </div>
  )
}
