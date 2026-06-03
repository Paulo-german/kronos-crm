import Link from 'next/link'
import { Zap } from 'lucide-react'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'

interface AgentsSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const settingsItems = [
  {
    key: 'credits',
    label: 'Créditos IA',
    description: 'Gerencie seus créditos de inteligência artificial e histórico de uso.',
    icon: Zap,
  },
]

const AgentsSettingsPage = async ({ params }: AgentsSettingsPageProps) => {
  const { orgSlug } = await params

  return (
    <div className="space-y-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Configurações</HeaderTitle>
          <HeaderSubTitle>Configure os recursos de inteligência artificial.</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {settingsItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={`/org/${orgSlug}/agents/settings/${item.key}`}
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
    </div>
  )
}

export default AgentsSettingsPage
