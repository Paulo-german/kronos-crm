import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'

interface PlansLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function PlansLayout({ children, params }: PlansLayoutProps) {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)
  const trialStatus = await getTrialStatus(orgId)

  return (
    <div className="flex h-screen flex-col overflow-y-auto">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <KronosLogo />
            <span className="text-xl font-bold tracking-tight">KRONOS</span>
          </div>

          {/* Botão voltar só aparece para quem já tem plano ativo — sem plano o usuário deve escolher */}
          {!trialStatus.isExpired && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/org/${orgSlug}/dashboard`}>
                <ArrowLeft className="mr-2 size-4" />
                Voltar ao painel
              </Link>
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4">
        {children}
      </main>
    </div>
  )
}
