import Link from 'next/link'
import { Target } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface GoalsEmptyStateProps {
  isElevated: boolean
  orgSlug: string
}

export function GoalsEmptyState({ isElevated, orgSlug }: GoalsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Target className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        {isElevated ? (
          <>
            <p className="text-sm font-medium">Nenhuma meta configurada</p>
            <p className="text-xs text-muted-foreground">
              Configure metas da organização ou por pipeline para acompanhar o progresso do time.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Você ainda não tem metas individuais</p>
            <p className="text-xs text-muted-foreground">Fale com seu gestor para configurar suas metas.</p>
          </>
        )}
      </div>
      {isElevated && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings/goals`}>Criar primeira meta</Link>
        </Button>
      )}
    </div>
  )
}
