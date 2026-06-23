import { Users } from 'lucide-react'
import { ComingSoon } from '../_components/coming-soon'

// ⚠️ MOCK — na fase real esta rota reaproveita a lista de Contatos do CRM
// (re-export de ContactsPage) com importação de CSV e segmentação avançada.
const ProspectionContactsPage = () => {
  return (
    <ComingSoon
      title="Contatos"
      subtitle="Sua base de contatos para prospecção."
      icon={Users}
      phase="Fase 2 — Listas"
      description="Aqui você verá e segmentará sua base de contatos, importará listas via CSV e montará públicos-alvo para seus disparos. Reaproveita a lista de Contatos já existente no CRM."
    />
  )
}

export default ProspectionContactsPage
