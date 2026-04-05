'use client'

import { useTransition } from 'react'
import { Loader2, Settings } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { createPortalSession } from '@/_actions/billing/create-portal-session'
import { toast } from 'sonner'

export function ManageSubscriptionButton() {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await createPortalSession({})

      if (result?.data?.url) {
        window.location.href = result.data.url
        return
      }

      toast.error('Não foi possível abrir o portal de assinatura. Tente novamente.')
    })
  }

  return (
    <Button onClick={handleClick} disabled={isPending} variant="default">
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Settings className="mr-2 h-4 w-4" />
      )}
      {isPending ? 'Carregando...' : 'Gerenciar assinatura'}
    </Button>
  )
}
