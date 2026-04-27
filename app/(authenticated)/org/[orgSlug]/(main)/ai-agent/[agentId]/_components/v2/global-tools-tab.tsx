'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { updateAgentGlobalTools } from '@/_actions/agent/update-agent-global-tools'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { GlobalTool } from '@/_actions/agent/shared/global-tool-schema'
import GlobalToolBuilder from './global-tool-builder'

interface GlobalToolsTabProps {
  agent: AgentDetailDto
  canManage: boolean
  onSaveSuccess?: () => void
}

const GlobalToolsTab = ({ agent, canManage, onSaveSuccess }: GlobalToolsTabProps) => {
  const [tools, setTools] = useState<GlobalTool[]>(agent.globalTools)

  const { execute, isPending } = useAction(updateAgentGlobalTools, {
    onSuccess: () => {
      toast.success('Ferramentas globais salvas com sucesso!')
      onSaveSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Falha ao salvar ferramentas globais. Tente novamente.')
    },
  })

  const handleSave = () => {
    execute({ agentId: agent.id, globalTools: tools })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Ferramentas Globais</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ferramentas que o agente pode usar em qualquer etapa da conversa, independente da etapa em que está.
        </p>
      </div>

      <GlobalToolBuilder value={tools} onChange={setTools} />

      {canManage && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export default GlobalToolsTab
