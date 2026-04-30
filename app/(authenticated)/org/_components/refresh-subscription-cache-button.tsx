'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { refreshSubscriptionCache } from '@/_actions/billing/refresh-subscription-cache'
import { useRefreshCooldown } from './use-refresh-cooldown'

interface RefreshSubscriptionCacheButtonProps {
  orgSlug: string
}

export function RefreshSubscriptionCacheButton({
  orgSlug,
}: RefreshSubscriptionCacheButtonProps) {
  const router = useRouter()
  const { secondsRemaining, isCoolingDown, start } = useRefreshCooldown(orgSlug)

  const { execute, isPending } = useAction(refreshSubscriptionCache, {
    onSuccess: () => {
      start()
      router.refresh()
      toast.success('Dados atualizados')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Não foi possível atualizar os dados')
    },
  })

  // Early return defensivo após todos os hooks — prop não deveria ser vazia neste contexto
  if (!orgSlug) return null

  const tooltipText = isCoolingDown
    ? `Aguarde ${secondsRemaining}s para atualizar novamente`
    : 'Atualizar dados de assinatura'

  function onClickRefresh() {
    if (isCoolingDown || isPending) return
    execute({})
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending || isCoolingDown}
            onClick={onClickRefresh}
          >
            <RefreshCw
              className={`size-4 ${isPending ? 'animate-spin' : ''}`}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
