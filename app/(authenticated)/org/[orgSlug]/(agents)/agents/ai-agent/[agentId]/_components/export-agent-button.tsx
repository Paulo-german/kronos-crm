'use client'

import { Download, Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import { exportAgent } from '@/_actions/agent/export-agent'

interface ExportAgentButtonProps {
  agentId: string
}

const ExportAgentButton = ({ agentId }: ExportAgentButtonProps) => {
  const { execute, isPending } = useAction(exportAgent, {
    onSuccess: ({ data }) => {
      if (!data) return

      const blob = new Blob([JSON.stringify(data.payload, null, 2)], {
        type: 'application/json',
      })

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = data.fileName
      anchor.click()
      URL.revokeObjectURL(url)

      toast.success('Agente exportado!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Falha ao exportar agente.')
    },
  })

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => execute({ agentId })}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Exportar
    </Button>
  )
}

export default ExportAgentButton
