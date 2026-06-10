'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { importAgent } from '@/_actions/agent/import-agent'
import type { ImportAgentInput } from '@/_actions/agent/import-agent/schema'

interface ImportAgentButtonProps {
  orgSlug: string
  withinQuota: boolean
}

const ImportAgentButton = ({ orgSlug, withinQuota }: ImportAgentButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const { execute, isPending } = useAction(importAgent, {
    onSuccess: ({ data }) => {
      if (!data) return

      if (data.warnings && data.warnings.length > 0) {
        const warningList = data.warnings.join(' • ')
        toast.warning(`Agente importado com avisos: ${warningList}`)
      } else {
        toast.success('Agente importado com sucesso!')
      }

      router.push(`/org/${orgSlug}/ai-agent/${data.agentId}`)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Falha ao importar agente.')
    },
  })

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Resetar o input para permitir reimportar o mesmo arquivo
    event.target.value = ''

    let parsedContent: unknown

    try {
      const rawText = await file.text()
      parsedContent = JSON.parse(rawText)
    } catch {
      toast.error('Arquivo JSON inválido.')
      return
    }

    execute(parsedContent as ImportAgentInput)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  if (!withinQuota) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="outline" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Importar Agente
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Limite atingido. Faça upgrade do plano.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <>
      <input
        type="file"
        accept="application/json"
        hidden
        ref={inputRef}
        onChange={handleFileChange}
      />
      <Button variant="outline" disabled={isPending} onClick={handleClick}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Importar Agente
      </Button>
    </>
  )
}

export default ImportAgentButton
