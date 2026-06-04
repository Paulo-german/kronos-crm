'use client'

import { useState } from 'react'
import { FlaskConical, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/_components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { Label } from '@/_components/ui/label'
import { createSimulatorConversation } from '@/_actions/inbox/create-simulator-conversation'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

interface AgentOption {
  id: string
  name: string
  isActive: boolean
}

interface SimulatorDialogProps {
  agents: AgentOption[]
  onConversationCreated: (conversation: ConversationListDto) => void
}

export function SimulatorDialog({ agents, onConversationCreated }: SimulatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')

  const activeAgents = agents.filter((agent) => agent.isActive)

  const { execute, isPending } = useAction(createSimulatorConversation, {
    onSuccess: (result) => {
      const conversation = result.data?.conversation
      if (!conversation) {
        toast.error('Erro ao iniciar simulação.')
        return
      }
      toast.success('Simulação iniciada.')
      setOpen(false)
      setSelectedAgentId('')
      onConversationCreated(conversation)
    },
    onError: (error) => {
      const message = error.error.serverError ?? 'Erro ao iniciar simulação.'
      toast.error(message)
    },
  })

  const handleConfirm = () => {
    if (!selectedAgentId) {
      toast.error('Selecione um agente para simular.')
      return
    }
    execute({ agentId: selectedAgentId })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedAgentId('')
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              <FlaskConical className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Testar Agente (Simulador)</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            Testar Agente no Inbox
          </DialogTitle>
          <DialogDescription>
            Selecione um agente para iniciar uma conversa simulada. As mensagens não são enviadas via WhatsApp — o pipeline completo da IA é executado normalmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="agent-select">Agente</Label>
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
              disabled={isPending}
            >
              <SelectTrigger id="agent-select">
                <SelectValue placeholder="Selecione um agente..." />
              </SelectTrigger>
              <SelectContent>
                {activeAgents.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhum agente ativo encontrado.
                  </div>
                ) : (
                  activeAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            A conversa anterior com este agente (se existir) será descartada e uma nova sessão será iniciada.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !selectedAgentId}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5" />
            )}
            Iniciar Simulação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
