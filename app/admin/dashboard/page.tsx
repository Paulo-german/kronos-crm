import { Building2, Users, CreditCard, Megaphone, CircleIcon } from 'lucide-react'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { getAdminStats } from '@/_data-access/admin/get-admin-stats'

const STATS_CONFIG = [
  { key: 'totalOrganizations', label: 'Organizações', subtitle: 'Com membros ativos', icon: Building2 },
  { key: 'totalUsers', label: 'Usuários', subtitle: 'Cadastrados na plataforma', icon: Users },
  { key: 'activeSubscriptions', label: 'Assinaturas Ativas', subtitle: 'Com status ativo', icon: CreditCard },
  { key: 'totalAnnouncements', label: 'Comunicados', subtitle: 'Enviados pela plataforma', icon: Megaphone },
] as const

const DashboardPage = async () => {
  const stats = await getAdminStats()

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Bem-vindo ao Delfos</HeaderTitle>
          <HeaderSubTitle>Painel administrativo da plataforma Kronos</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS_CONFIG.map((config) => {
          const Icon = config.icon
          return (
            <div
              key={config.key}
              className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:bg-card/80"
            >
              <div className="flex flex-col gap-3 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kronos-purple/10 text-kronos-purple">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CircleIcon className="h-1.5 w-1.5 fill-kronos-green text-kronos-green" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats[config.key].toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">{config.subtitle}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardPage
