'use client'

import { useState, type ReactNode } from 'react'
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
import { Input } from '@/_components/ui/input'
import { LIFECYCLE_STAGE_CONFIG } from '@/_lib/lifecycle/lifecycle-stage-config'
import { createSimulatorConversation } from '@/_actions/inbox/create-simulator-conversation'
import {
  SIMULATOR_SEEDABLE_STAGES,
  type CreateSimulatorConversationInput,
} from '@/_actions/inbox/create-simulator-conversation/schema'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

interface AgentOption {
  id: string
  name: string
  isActive: boolean
}

interface SimulatorDialogProps {
  agents: AgentOption[]
  onConversationCreated: (conversation: ConversationListDto) => void
  /** Trigger customizado (ex: botão grande no empty-state). Se ausente, usa o ícone padrão da sidebar */
  trigger?: ReactNode
}

type SeedableStage = (typeof SIMULATOR_SEEDABLE_STAGES)[number]

const DEFAULT_STAGE: SeedableStage = 'LEAD'

export function SimulatorDialog({
  agents,
  onConversationCreated,
  trigger,
}: SimulatorDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [lifecycleStage, setLifecycleStage] =
    useState<SeedableStage>(DEFAULT_STAGE)
  const [personaName, setPersonaName] = useState('')
  const [personaEmail, setPersonaEmail] = useState('')
  const [personaRole, setPersonaRole] = useState('')

  const activeAgents = agents.filter((agent) => agent.isActive)

  const resetForm = () => {
    setSelectedAgentId('')
    setLifecycleStage(DEFAULT_STAGE)
    setPersonaName('')
    setPersonaEmail('')
    setPersonaRole('')
  }

  const { execute, isPending } = useAction(createSimulatorConversation, {
    onSuccess: (result) => {
      const conversation = result.data?.conversation
      if (!conversation) {
        toast.error('Erro ao iniciar simulação.')
        return
      }
      toast.success('Simulação iniciada.')
      setOpen(false)
      resetForm()
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

    // Só envia persona quando algum campo foi preenchido — senão o contato usa o default.
    const hasPersona = !!(
      personaName.trim() ||
      personaEmail.trim() ||
      personaRole.trim()
    )
    const persona: CreateSimulatorConversationInput['persona'] = hasPersona
      ? {
          name: personaName.trim() || undefined,
          email: personaEmail.trim() || undefined,
          role: personaRole.trim() || undefined,
        }
      : undefined

    execute({
      agentId: selectedAgentId,
      initialLifecycleStage: lifecycleStage,
      persona,
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
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
      )}

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            Testar Agente no Inbox
          </DialogTitle>
          <DialogDescription>
            Selecione um agente para iniciar uma conversa simulada. As mensagens
            não são enviadas via WhatsApp — o pipeline completo da IA é
            executado normalmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          <div className="space-y-2">
            <Label htmlFor="lifecycle-select">
              Ponto de partida (lifecycle)
            </Label>
            <Select
              value={lifecycleStage}
              onValueChange={(value) =>
                setLifecycleStage(value as SeedableStage)
              }
              disabled={isPending}
            >
              <SelectTrigger id="lifecycle-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIMULATOR_SEEDABLE_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {LIFECYCLE_STAGE_CONFIG[stage].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Semeia o contato neste estágio do funil para testar o agente no
              meio do fluxo. Reiniciar a simulação volta o contato para Lead.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Persona (opcional)</Label>
            <div className="grid gap-2">
              <Input
                placeholder="Nome do contato"
                value={personaName}
                onChange={(event) => setPersonaName(event.target.value)}
                disabled={isPending}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="email"
                  placeholder="E-mail"
                  value={personaEmail}
                  onChange={(event) => setPersonaEmail(event.target.value)}
                  disabled={isPending}
                />
                <Input
                  placeholder="Cargo"
                  value={personaRole}
                  onChange={(event) => setPersonaRole(event.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            A conversa anterior com este agente (se existir) será descartada e
            uma nova sessão será iniciada.
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
