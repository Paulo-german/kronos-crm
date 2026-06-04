'use client'

import { Button } from '@/_components/ui/button'

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold">Algo deu errado</h2>
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar o dashboard. Tente novamente.
      </p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
