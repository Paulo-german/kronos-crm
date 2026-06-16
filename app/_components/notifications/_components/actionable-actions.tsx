'use client'

import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { NotificationAction } from '../notification/notification-action'
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

  const { execute: executeAccept, isPending: isPendingAccept } = useAction(
    acceptInvite,
    {
      onSuccess: ({ data }) => {
        toast.success('Convite aceito! Bem-vindo à equipe.')
        onAccepted()
        if (data?.orgSlug) {
          router.push(`/org//crm/home`)
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao aceitar convite.')
      },
    },
  )

  const { execute: executeDecline, isPending: isPendingDecline } = useAction(
    declineInvite,
    {
      onSuccess: () => {
        toast.success('Convite recusado.')
        onDeclined()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao recusar convite.')
      },
    },
  )

  const isLoading = isPendingAccept || isPendingDecline

  return (
    <div className="mt-3 flex items-center gap-2">
      <NotificationAction
        label="Aceitar"
        icon={Check}
        variant="default"
        onClick={() => executeAccept({ token })}
        isPending={isPendingAccept}
        disabled={isLoading}
      />

      <NotificationAction
        label="Recusar"
        icon={X}
        onClick={() => executeDecline({ token })}
        isPending={isPendingDecline}
        disabled={isLoading}
      />
    </div>
  )
}
