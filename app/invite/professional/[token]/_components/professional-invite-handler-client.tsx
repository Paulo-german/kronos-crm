'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { acceptProfessionalInvite } from '@/_actions/professional/accept-professional-invite'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'

interface ProfessionalInviteHandlerClientProps {
  token: string
  professionalName: string
  orgName: string
  orgSlug: string
}

export function ProfessionalInviteHandlerClient({
  token,
  professionalName,
  orgName,
  orgSlug,
}: ProfessionalInviteHandlerClientProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { execute, isPending, hasSucceeded } = useAction(
    acceptProfessionalInvite,
    {
      onSuccess: () => {
        toast.success(`Bem-vindo à agenda de ${orgName}!`)
        router.push(`/org/${orgSlug}/agenda`)
      },
      onError: ({ error: actionError }) => {
        setError(actionError.serverError ?? 'Erro ao aceitar convite.')
      },
    },
  )

  if (hasSucceeded) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <p>Redirecionando...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" onClick={() => router.push('/org')}>
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Convite para agenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Você foi convidado para acessar a agenda de{' '}
            <strong>{orgName}</strong> como profissional{' '}
            <strong>{professionalName}</strong>.
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => execute({ token })}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Aceitando...
            </>
          ) : (
            'Aceitar convite'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
