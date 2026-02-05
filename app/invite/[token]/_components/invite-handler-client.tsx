'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { acceptInvite } from '@/_actions/organization/accept-invite'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'

interface InviteHandlerClientProps {
  token: string
  orgName: string
  inviteEmail: string
  currentUserEmail: string
}

export function InviteHandlerClient({
  token,
  orgName,
  inviteEmail,
  currentUserEmail,
}: InviteHandlerClientProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { execute, isPending, hasSucceeded } = useAction(acceptInvite, {
    onSuccess: ({ data }) => {
      if (data?.success && data.orgSlug) {
        toast.success(`Bem-vindo à ${orgName}!`)
        router.push(`/org/${data.orgSlug}/dashboard`)
      }
    },
    onError: ({ error }) => {
      setError(error.serverError || 'Erro ao aceitar convite.')
    },
  })

  // Email mismatch check
  const isEmailMatch = inviteEmail === currentUserEmail

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Convite para {orgName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        {!isEmailMatch ? (
          <div className="space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <div className="space-y-2">
              <p className="font-medium text-red-500">E-mail Incorreto</p>
              <p className="text-sm text-muted-foreground">
                O convite foi enviado para{' '}
                <span className="font-bold">{inviteEmail}</span>, mas você está
                logado como{' '}
                <span className="font-bold">{currentUserEmail}</span>.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/api/auth/signout')} // Depende de como é feito o logout no projeto, assumindo rota padrão ou redirect manual
            >
              Sair e entrar com outra conta
            </Button>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="outline" onClick={() => router.push('/org')}>
              Voltar para Dashboard
            </Button>
          </div>
        ) : hasSucceeded ? (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <p>Redirecionando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p>Você foi convidado para colaborar como membro.</p>
              <p className="text-xs text-muted-foreground">
                Logado como: {currentUserEmail}
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
                'Aceitar Convite'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
