import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface TestChatNoCreditsProps {
  orgSlug: string
}

const TestChatNoCredits = ({ orgSlug }: TestChatNoCreditsProps) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Créditos insuficientes
        </p>
        <p className="text-xs text-muted-foreground">
          Não há créditos disponíveis para continuar o teste do agente.
        </p>
      </div>
      <Button asChild size="sm" className="mt-2">
        <Link href={`/org/${orgSlug}/settings/billing`}>
          Gerenciar créditos
        </Link>
      </Button>
    </div>
  )
}

export default TestChatNoCredits
