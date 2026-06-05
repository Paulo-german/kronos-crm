'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Loader2, Save, Wrench } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import { cn } from '@/_lib/utils'
import GlobalToolBuilder from './global-tool-builder'
import { updateAgentGlobalTools } from '@/_actions/agent/update-agent-global-tools'
import type { GlobalTool } from '@/_actions/agent/shared/global-tool-schema'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'

interface GlobalToolsSectionProps {
  agent: AgentDetailDto
  canManage: boolean
  onSaveSuccess?: () => void
}

const GlobalToolsSection = ({ agent, canManage, onSaveSuccess }: GlobalToolsSectionProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [globalTools, setGlobalTools] = useState<GlobalTool[]>(agent.globalTools)

  useEffect(() => {
    setGlobalTools(agent.globalTools)
  }, [agent.globalTools])

  const { execute, isPending } = useAction(updateAgentGlobalTools, {
    onSuccess: () => {
      toast.success('Ferramentas globais salvas!')
      onSaveSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Falha ao salvar ferramentas globais.')
    },
  })

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Ferramentas Globais</span>
              {globalTools.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {globalTools.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Disponíveis em qualquer etapa da conversa.
            </p>
            <GlobalToolBuilder value={globalTools} onChange={setGlobalTools} steps={agent.steps} />
            {canManage && (
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => execute({ agentId: agent.id, globalTools })}
                  type="button"
                >
                  {isPending
                    ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    : <Save className="mr-2 h-3.5 w-3.5" />}
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export default GlobalToolsSection
