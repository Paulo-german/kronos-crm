'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { KronosLogo } from '@/_components/icons/kronos-logo'

interface TrialGateClientProps {
  isExpired: boolean
  orgSlug: string
  children: React.ReactNode
}

export const TrialGateClient = ({
  isExpired,
  orgSlug,
  children,
}: TrialGateClientProps) => {
  const pathname = usePathname()

  // Permitir acesso a settings mesmo com trial expirado
  const isSettingsPage = pathname.includes('/settings')

  if (!isExpired || isSettingsPage) return <>{children}</>

  return (
    <>
      {children}
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/55 backdrop-blur-sm">
        <Card className="max-w-3xl overflow-hidden border-border/50 p-0">
          <div className="flex">
            {/* Painel esquerdo: gradiente Kronos */}
            <div className="bg-banner-premium hidden w-[320px] shrink-0 flex-col items-center justify-center gap-6 sm:flex">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <KronosLogo className="h-8 w-8 text-white" />
              </div>
              <div className="px-4 text-center">
                <p className="text-lg font-bold text-white">
                  Pronto(a) para crescer?
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Seus dados estao seguros
                </p>
              </div>
            </div>

            {/* Painel direito: conteudo */}
            <div className="flex flex-1 flex-col p-8">
              <h2 className="text-xl font-semibold tracking-tight">
                Hora de dar o proximo passo!
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Seu periodo de teste terminou, mas a boa noticia e que todos os
                seus dados continuam salvos e esperando por voce. Escolha um
                plano e continue de onde parou.
              </p>

              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  Todos os seus contatos e negocios preservados
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  Acesso imediato apos a assinatura
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  Cancele quando quiser, sem compromisso
                </li>
              </ul>

              <div className="mt-6 flex flex-col gap-2">
                <Button asChild size="lg">
                  <Link href={`/org/${orgSlug}/settings/billing`}>
                    Escolher meu plano
                  </Link>
                </Button>
                <a
                  href="mailto:suporte@kronos.com"
                  className="text-center text-sm text-muted-foreground"
                >
                  Ainda tem dúvidas?{' '}
                  <span className="font-bold text-primary hover:text-primary/80">
                    Fale conosco
                  </span>
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
