import Link from 'next/link'
import { Calculator, TrendingUp, ArrowRight } from 'lucide-react'
import Header, { HeaderLeft, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/_components/ui/card'

const SIMULATIONS = [
  {
    href: '/admin/simulator/ai-credits',
    icon: Calculator,
    title: 'Créditos IA',
    description:
      'Dado um log do OpenRouter (tokens + custo), calcula a margem por plano e o tokensPerCredit ideal para atingir a margem alvo.',
  },
  {
    href: '/admin/simulator/viability',
    icon: TrendingUp,
    title: 'Viabilidade do Negócio',
    description:
      'Usa a base real de assinaturas ativas + custos fixos para calcular margem agregada, break-even e preço sugerido por plano.',
  },
]

export default function SimulatorHubPage() {
  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Simuladores</HeaderTitle>
          <HeaderSubTitle>Ferramentas de análise de margem e precificação.</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="grid gap-4 md:grid-cols-2">
        {SIMULATIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
