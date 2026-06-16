'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Building2, RotateCw } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Loga o erro para observabilidade (substituir por serviço externo se houver)
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5">
        <AlertTriangle className="size-8 text-destructive" />
      </div>

      <div className="space-y-2">
        <p className="font-mono text-sm font-medium text-muted-foreground">
          Algo deu errado
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Não foi possível carregar esta página
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Ocorreu um erro inesperado ao processar sua solicitação. Tente
          novamente em instantes.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground/70">
            Código: {error.digest}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RotateCw className="size-4" />
          Tentar novamente
        </Button>
        <Button asChild variant="outline">
          <Link href="/org">
            <Building2 className="size-4" />
            Voltar para organizações
          </Link>
        </Button>
      </div>
    </main>
  )
}
