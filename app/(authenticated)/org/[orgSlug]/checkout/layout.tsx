import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { Button } from '@/_components/ui/button'
import { CheckoutStepper } from './_components/checkout-stepper'
import { OrderSummary } from './_components/order-summary'

interface CheckoutLayoutProps {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function CheckoutLayout({
  children,
  params,
}: CheckoutLayoutProps) {
  const { orgSlug } = await params

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <KronosLogo />
            <span className="text-xl font-bold tracking-tight">KRONOS</span>
          </div>

          <Button variant="ghost" size="sm" asChild>
            <Link href={`/org/${orgSlug}/settings/billing`}>
              <ArrowLeft className="mr-2 size-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto flex justify-center px-4 py-6">
        <CheckoutStepper />
      </div>

      <main className="container mx-auto flex-1 px-4 pb-12">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_350px]">
          <div>{children}</div>
          <div className="order-first lg:order-last">
            <div className="sticky top-6">
              <OrderSummary />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
