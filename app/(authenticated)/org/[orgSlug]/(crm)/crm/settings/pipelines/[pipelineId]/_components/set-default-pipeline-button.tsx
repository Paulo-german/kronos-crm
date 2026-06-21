'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { setDefaultPipeline } from '@/_actions/pipeline/set-default-pipeline'

interface SetDefaultPipelineButtonProps {
  pipelineId: string
}

export function SetDefaultPipelineButton({
  pipelineId,
}: SetDefaultPipelineButtonProps) {
  const router = useRouter()

  const { execute, isPending } = useAction(setDefaultPipeline, {
    onSuccess: () => {
      toast.success('Funil padrão definido com sucesso!')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao definir funil padrão.')
    },
  })

  return (
    <Button
      variant="soft"
      size="sm"
      onClick={() => execute({ pipelineId })}
      disabled={isPending}
    >
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Definir como padrão
    </Button>
  )
}
