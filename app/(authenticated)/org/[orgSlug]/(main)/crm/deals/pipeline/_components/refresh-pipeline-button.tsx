'use client'

import { useState, useRef, useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { RefreshCwIcon, Loader2 } from 'lucide-react'
import { revalidatePipeline } from '@/_actions/pipeline/revalidate-pipeline'
import { toast } from 'sonner'

const COOLDOWN_MS = 2 * 60 * 1000

export const RefreshPipelineButton = () => {
  const router = useRouter()
  const lastRefreshRef = useRef<number>(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { execute, isPending } = useAction(revalidatePipeline, {
    onSuccess: () => {
      router.refresh()
      toast.success('Pipeline atualizado.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar.')
    },
  })

  const startCooldown = () => {
    lastRefreshRef.current = Date.now()
    setRemainingSeconds(Math.ceil(COOLDOWN_MS / 1000))

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastRefreshRef.current
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
      if (remaining <= 0) {
        setRemainingSeconds(0)
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setRemainingSeconds(remaining)
      }
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleRefresh = () => {
    const elapsed = Date.now() - lastRefreshRef.current
    if (elapsed < COOLDOWN_MS) return
    execute()
    startCooldown()
  }

  const isDisabled = isPending || remainingSeconds > 0

  const formatRemaining = () => {
    const min = Math.floor(remainingSeconds / 60)
    const sec = remainingSeconds % 60
    return `${min}:${String(sec).padStart(2, '0')}`
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={isDisabled}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {remainingSeconds > 0
          ? `Aguarde ${formatRemaining()} para atualizar novamente`
          : 'Atualizar pipeline'}
      </TooltipContent>
    </Tooltip>
  )
}
