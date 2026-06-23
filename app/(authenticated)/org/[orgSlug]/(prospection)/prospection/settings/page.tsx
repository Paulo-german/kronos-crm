import { Settings2 } from 'lucide-react'
import { ComingSoon } from '../_components/coming-soon'

const ProspectionSettingsPage = () => {
  return (
    <ComingSoon
      title="Configurações"
      subtitle="Ajustes do Kronos Prospection."
      icon={Settings2}
      description="Configure padrões de envio, limites de velocidade, canais habilitados para disparo e preferências de segurança anti-bloqueio."
    />
  )
}

export default ProspectionSettingsPage
