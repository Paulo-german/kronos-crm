import { BarChart3 } from 'lucide-react'
import { ComingSoon } from '../_components/coming-soon'

const ProspectionReportsPage = () => {
  return (
    <ComingSoon
      title="Analisar"
      subtitle="Métricas e desempenho das suas campanhas de prospecção."
      icon={BarChart3}
      phase="Fase 4 — Analytics"
      description="Acompanhe taxa de entrega, falhas por canal, evolução no tempo e os disparos com melhor desempenho."
    />
  )
}

export default ProspectionReportsPage
