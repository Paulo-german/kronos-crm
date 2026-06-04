'use client'

import { CheckCheck, Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/_components/ui/button'
import { markAllNotificationsAsRead } from '@/_actions/notification/mark-all-as-read'

interface MarkAllReadButtonProps {
  hasUnread: boolean
}

export const MarkAllReadButton = ({ hasUnread }: MarkAllReadButtonProps) => {
  const router = useRouter()

  const { execute, isPending } = useAction(markAllNotificationsAsRead, {
    onSuccess: () => {
      toast.success('Todas as notificações foram marcadas como lidas.')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao marcar todas as notificações.')
    },
  })

  if (!hasUnread) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => execute(undefined)}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <CheckCheck className="mr-2 size-4" />
      )}
      Marcar todas como lidas
    </Button>
  )
}
