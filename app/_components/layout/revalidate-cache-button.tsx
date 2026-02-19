'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/_components/ui/tooltip'
import { revalidateAllCache } from '@/_actions/dev/revalidate-all-cache'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'

export const RevalidateCacheButton = () => {
  const [isPending, startTransition] = useTransition()
  const [spinning, setSpinning] = useState(false)

  const handleClick = () => {
    setSpinning(true)
    startTransition(async () => {
      const result = await revalidateAllCache()

      if (result?.data) {
        toast.success(`Cache revalidado (${result.data.revalidated} tags)`)
      } else {
        toast.error('Erro ao revalidar cache')
      }

      setTimeout(() => setSpinning(false), 600)
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="link"
          size="icon"
          onClick={handleClick}
          disabled={isPending}
        >
          <RefreshCw
            className={cn(
              'h-[1.2rem] w-[1.2rem] transition-transform',
              spinning && 'animate-spin',
            )}
          />
          <span className="sr-only">Revalidar cache</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Revalidar cache</TooltipContent>
    </Tooltip>
  )
}
