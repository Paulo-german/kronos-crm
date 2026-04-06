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
    <div className="relative flex h-screen flex-col overflow-y-auto bg-background">
      {/* Background: grid lines + purple glow */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        {/* Grid vertical lines */}
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.025]"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent), repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent)',
            backgroundSize: '80px 80px',
          }}
        />
        {/* Purple glow top center */}
        <div className="absolute -top-32 left-1/2 size-[800px] -translate-x-1/2 rounded-full bg-[#8257e5]/5 dark:bg-[#8257e5]/10 blur-[160px]" />
      </div>

      <header className="relative border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <KronosLogo />
            <span className="text-xl font-bold tracking-tight">KRONOS</span>
          </div>

          <div className="flex items-center gap-2">
            {!trialStatus.isExpired && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/org/${orgSlug}/dashboard`}>
                  <ArrowLeft className="mr-2 size-4" />
                  Voltar ao painel
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/org?show=true">
                Minhas organizações
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto flex-1 px-4">
        {children}
      </main>
    </div>
  )
}
