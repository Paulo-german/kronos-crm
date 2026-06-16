import Link from 'next/link'
import { ArrowLeft, Compass } from 'lucide-react'
import { Button } from '@/_components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border/50 bg-muted/40">
        <Compass className="size-8 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <p className="font-mono text-sm font-medium text-muted-foreground">
          Erro 404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          A página que você procura não existe mais ou o endereço está
          incorreto.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Voltar para o início
          </Link>
        </Button>
      </div>
    </main>
  )
}
