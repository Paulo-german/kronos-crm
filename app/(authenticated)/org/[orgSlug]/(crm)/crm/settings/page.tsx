import Link from 'next/link'
import {
  Workflow,
  Target,
  TrendingDown,
  LayoutList,
  Package,
  Briefcase,
  CalendarDays,
  Zap,
} from 'lucide-react'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'

interface CrmSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const settingsItems = [
  {
    key: 'pipelines',
    label: 'Funis de Vendas',
    description: 'Gerencie os funis e etapas de vendas da sua organização.',
    icon: Workflow,
  },
  {
    key: 'goals',
    label: 'Metas de Vendas',
    description: 'Configure metas de receita, negócios e atividades.',
    icon: Target,
  },
  {
    key: 'loss-reasons',
    label: 'Motivos de Perda',
    description: 'Defina os motivos usados ao marcar um negócio como perdido.',
    icon: TrendingDown,
  },
  {
    key: 'custom-fields',
    label: 'Campos Personalizados',
    description: 'Adicione campos extras a contatos, empresas e negócios.',
    icon: LayoutList,
  },
  {
    key: 'catalog',
    label: 'Catálogo de Produtos',
    description: 'Gerencie produtos e serviços para uso em negócios.',
    icon: Package,
  },
  {
    key: 'professionals',
    label: 'Profissionais',
    description: 'Cadastre os profissionais disponíveis para agendamento.',
    icon: Briefcase,
  },
  {
    key: 'scheduling',
    label: 'Agendamento',
    description: 'Configure tipos de compromisso e disponibilidade.',
    icon: CalendarDays,
  },
  {
    key: 'automations',
    label: 'Automações',
    description: 'Configure regras automáticas para negócios e contatos.',
    icon: Zap,
  },
]

const CrmSettingsPage = async ({ params }: CrmSettingsPageProps) => {
  const { orgSlug } = await params

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Configurações</HeaderTitle>
          <HeaderSubTitle>
            Personalize o CRM de acordo com o seu processo de vendas.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {settingsItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={`/org/${orgSlug}/crm/settings/${item.key}`}
                className="group flex items-start gap-4 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-border hover:bg-accent/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background text-muted-foreground group-hover:text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
    </div>
  )
}

export default CrmSettingsPage
