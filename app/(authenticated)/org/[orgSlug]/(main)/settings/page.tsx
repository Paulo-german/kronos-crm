import {
  Building2,
  CreditCard,
  Package,
  UserIcon,
  Users,
  Ban,
  Mail,
} from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'

import CardSettings from './_components/card-settings'

interface SettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const SettingsPage = async ({ params }: SettingsPageProps) => {
  const { orgSlug } = await params
  const { userRole } = await getOrgContext(orgSlug)

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize sua conta e preferências.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CardSettings
          title="Perfil"
          description="Atualize suas informações pessoais."
          href="settings/profile"
          orgSlug={orgSlug}
        >
          <UserIcon size={20} />
        </CardSettings>
        {userRole !== 'MEMBER' && (
          <>
            <CardSettings
              title="Organização"
              description="Informações e configurações da organização."
              href="settings/organization"
              orgSlug={orgSlug}
            >
              <Building2 size={20} />
            </CardSettings>
            <CardSettings
              title="Membros"
              description="Gerencie quem tem acesso à organização."
              href="settings/members"
              orgSlug={orgSlug}
            >
              <Users size={20} />
            </CardSettings>
            <CardSettings
              title="Faturamento"
              description="Gerencie seu plano e informações de pagamento."
              href="settings/billing"
              orgSlug={orgSlug}
            >
              <CreditCard size={20} />
            </CardSettings>
            <CardSettings
              title="Produtos"
              description="Gerencie seu catálogo de produtos."
              href="settings/products"
              orgSlug={orgSlug}
            >
              <Package size={20} />
            </CardSettings>
            <CardSettings
              title="Caixas de Entrada"
              description="Gerencie suas conexões WhatsApp e canais de atendimento."
              href="settings/inboxes"
              orgSlug={orgSlug}
            >
              <Mail size={20} />
            </CardSettings>
            <CardSettings
              title="Motivos de Perda"
              description="Gerencie os motivos de perda de negociações."
              href="settings/loss-reasons"
              orgSlug={orgSlug}
            >
              <Ban size={20} />
            </CardSettings>
          </>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
