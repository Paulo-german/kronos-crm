import { Bell } from 'lucide-react'
import { ComingSoon } from '../_components/coming-soon'

const ProspectionNotificationsPage = () => {
  return (
    <ComingSoon
      title="Notificações"
      subtitle="Avisos sobre seus disparos e campanhas."
      icon={Bell}
      description="Você será notificado quando disparos forem concluídos, falharem ou exigirem sua atenção."
    />
  )
}

export default ProspectionNotificationsPage
