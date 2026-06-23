import { FileText } from 'lucide-react'
import { ComingSoon } from '../_components/coming-soon'

const ProspectionTemplatesPage = () => {
  return (
    <ComingSoon
      title="Templates"
      subtitle="Modelos de mensagem (HSM) aprovados pela Meta."
      icon={FileText}
      phase="Fase 3 — Templates HSM"
      description="Crie e gerencie modelos de mensagem aprovados para iniciar conversas via WhatsApp Cloud API, com variáveis dinâmicas reutilizáveis nos disparos."
    />
  )
}

export default ProspectionTemplatesPage
