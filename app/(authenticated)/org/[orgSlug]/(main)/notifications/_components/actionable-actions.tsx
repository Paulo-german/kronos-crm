'use client'

import { useRouter } from 'next/navigation'
import { Loader2, Check, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import { acceptInvite } from '@/_actions/organization/accept-invite'
import { declineInvite } from '@/_actions/organization/decline-invite'

interface ActionableActionsProps {
  token: string
  onAccepted: () => void
  onDeclined: () => void
}

export const ActionableActions = ({
  token,
  onAccepted,
  onDeclined,
}: ActionableActionsProps) => {
  const router = useRouter()

  const { execute: executeAccept, isPending: isPendingAccept } = useAction(acceptInvite, {
    onSuccess: ({ data }) => {
      toast.success('Convite aceito! Bem-vindo à equipe.')
      onAccepted()
      if (data?.orgSlug) {
        router.push(`/org/${data.orgSlug}/dashboard`)
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao aceitar convite.')
    },
  })

  const { execute: executeDecline, isPending: isPendingDecline } = useAction(declineInvite, {
    onSuccess: () => {
      toast.success('Convite recusado.')
      onDeclined()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao recusar convite.')
    },
  })

  const isLoading = isPendingAccept || isPendingDecline

  return (
    <div className="mt-3 flex items-center gap-2">
      <Button
        size="sm"
        onClick={(event) => {
          event.stopPropagation()
          executeAccept({ token })
        }}
        disabled={isLoading}
        className="h-7 gap-1.5 px-3 text-xs"
      >
        {isPendingAccept ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Check className="size-3" />
        )}
        Aceitar
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={(event) => {
          event.stopPropagation()
          executeDecline({ token })
        }}
        disabled={isLoading}
        className="h-7 gap-1.5 px-3 text-xs"
      >
        {isPendingDecline ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <X className="size-3" />
        )}
        Recusar
      </Button>
    </div>
  )
}
