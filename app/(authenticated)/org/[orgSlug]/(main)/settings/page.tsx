import {
  Ban,
  Building2,
  CreditCard,
  FunnelIcon,
  Mail,
  Package,
  Plug,
  Sparkles,
  Tag,
  UserIcon,
  Users,
  Zap,
} from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'

import CardSettings from './_components/card-settings'

interface SettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const SettingsPage = async ({ params }: SettingsPageProps) => {
  const { orgSlug } = await params
  const { userRole } = await getOrgContext(orgSlug)

  const isAdmin = userRole !== 'MEMBER'

  return (
    <div className="container mx-auto space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize sua conta e preferências.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Coluna esquerda */}
        <div className="space-y-8">
          {/* Conta */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Conta</h2>
            <div className="grid gap-3">
              <CardSettings
                title="Meu Perfil"

                href="settings/profile"
                orgSlug={orgSlug}
              >
                <UserIcon size={20} />
              </CardSettings>
            </div>
          </section>

          {/* Conversas */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Conversas</h2>
            <div className="grid gap-3">
              {isAdmin && (
                <CardSettings
                  title="Canais de Atendimento"

                  href="settings/inboxes"
                  orgSlug={orgSlug}
                >
                  <Mail size={20} />
                </CardSettings>
              )}
              <CardSettings
                title="Etiquetas"

                href="settings/labels"
                orgSlug={orgSlug}
              >
                <Tag size={20} />
              </CardSettings>
              {isAdmin && (
                <CardSettings
                  title="Automações"

                  href="settings/automations"
                  orgSlug={orgSlug}
                >
                  <Zap size={20} />
                </CardSettings>
              )}
            </div>
          </section>

          {/* Vendas — apenas admin */}
          {isAdmin && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Vendas</h2>
              <div className="grid gap-3">
                <CardSettings
                  title="Funil de Vendas"

                  href="settings/pipelines"
                  orgSlug={orgSlug}
                >
                  <FunnelIcon size={20} />
                </CardSettings>
                <CardSettings
                  title="Catálogo de Produtos"

                  href="settings/products"
                  orgSlug={orgSlug}
                >
                  <Package size={20} />
                </CardSettings>
                <CardSettings
                  title="Motivos de Perda"

                  href="settings/loss-reasons"
                  orgSlug={orgSlug}
                >
                  <Ban size={20} />
                </CardSettings>
              </div>
            </section>
          )}
        </div>

        {/* Coluna direita */}
        <div className="space-y-8">
          {/* Organização — apenas admin */}
          {isAdmin && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Organização</h2>
              <div className="grid gap-3">
                <CardSettings
                  title="Dados da Empresa"

                  href="settings/organization"
                  orgSlug={orgSlug}
                >
                  <Building2 size={20} />
                </CardSettings>
                <CardSettings
                  title="Equipe"

                  href="settings/members"
                  orgSlug={orgSlug}
                >
                  <Users size={20} />
                </CardSettings>
                <CardSettings
                  title="Integrações"

                  href="settings/integrations"
                  orgSlug={orgSlug}
                >
                  <Plug size={20} />
                </CardSettings>
              </div>
            </section>
          )}

          {/* Financeiro — apenas admin */}
          {isAdmin && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Financeiro</h2>
              <div className="grid gap-3">
                <CardSettings
                  title="Plano e Pagamento"

                  href="settings/billing"
                  orgSlug={orgSlug}
                >
                  <CreditCard size={20} />
                </CardSettings>
                <CardSettings
                  title="Créditos IA"

                  href="settings/credits"
                  orgSlug={orgSlug}
                >
                  <Sparkles size={20} />
                </CardSettings>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
