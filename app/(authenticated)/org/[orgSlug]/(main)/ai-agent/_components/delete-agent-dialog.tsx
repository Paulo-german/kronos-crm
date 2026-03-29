'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { TrashIcon, Loader2, Users, AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Label } from '@/_components/ui/label'
import { deleteAgent } from '@/_actions/agent/delete-agent'
import type { AgentDto } from '@/_data-access/agent/get-agents'

type GroupStrategy = 'remove_from_groups' | 'replace_with_agent'

interface ImpactedGroup {
  groupId: string
  groupName: string
}

interface DeleteAgentDialogProps {
  agent: AgentDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  allAgents: AgentDto[]
}

const DeleteAgentDialog = ({
  agent,
  open,
  onOpenChange,
  allAgents,
}: DeleteAgentDialogProps) => {
  const [phase, setPhase] = useState<'confirm' | 'group-decision'>('confirm')
  const [impactedGroups, setImpactedGroups] = useState<ImpactedGroup[]>([])
  const [groupStrategy, setGroupStrategy] = useState<GroupStrategy>('remove_from_groups')
  const [replacementAgentId, setReplacementAgentId] = useState<string>('')

  const { execute: executeDelete, isPending: isDeleting } = useAction(deleteAgent, {
    onSuccess: ({ data }) => {
      if (data?.requiresGroupDecision && data.groups) {
        // Primeira chamada: agente pertence a grupos — pedir decisão
        setImpactedGroups(data.groups)
        setPhase('group-decision')
        return
      }

      // Delete concluído com sucesso
      toast.success('Agente excluído com sucesso.')
      handleClose()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao excluir agente.')
    },
  })

  const handleClose = () => {
    onOpenChange(false)
    // Resetar estado local com delay para evitar flash visual durante animação de fechar
    setTimeout(() => {
      setPhase('confirm')
      setImpactedGroups([])
      setGroupStrategy('remove_from_groups')
      setReplacementAgentId('')
    }, 300)
  }

  const handleConfirmDelete = () => {
    if (!agent) return
    executeDelete({ id: agent.id })
  }

  const handleConfirmGroupDecision = () => {
    if (!agent) return

    if (groupStrategy === 'replace_with_agent' && !replacementAgentId) {
      toast.error('Selecione um agente substituto.')
      return
    }

    executeDelete({
      id: agent.id,
      groupStrategy,
      ...(groupStrategy === 'replace_with_agent' ? { replacementAgentId } : {}),
    })
  }

  // Agentes disponíveis para substituição (exclui o agente que está sendo deletado)
  const availableReplacementAgents = allAgents.filter(
    (candidate) => candidate.id !== agent?.id,
  )

  if (!agent) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
    >
      <DialogContent className="max-w-md">
        {phase === 'confirm' && (
          <>
            <DialogHeader className="space-y-4">
              <DialogTitle className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-destructive/20 text-destructive">
                  <TrashIcon className="h-6 w-6" />
                </div>
                <span>Você tem certeza absoluta?</span>
              </DialogTitle>
              <DialogDescription className="text-center">
                Esta ação não pode ser desfeita. Você está prestes a remover permanentemente o
                agente <span className="font-bold text-foreground">{agent.name}</span> e todos os
                seus dados (etapas, arquivos, conversas).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="mr-2 h-4 w-4" />
                )}
                Confirmar Exclusão
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === 'group-decision' && (
          <>
            <DialogHeader className="space-y-4">
              <DialogTitle className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertTriangleIcon className="h-6 w-6" />
                </div>
                <span>Este agente pertence a equipe(s)</span>
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-center">
                  <p>
                    O agente <span className="font-bold text-foreground">{agent.name}</span>{' '}
                    é worker de {impactedGroups.length}{' '}
                    {impactedGroups.length === 1 ? 'equipe' : 'equipes'}. O que deseja fazer?
                  </p>

                  {/* Lista das equipes impactadas */}
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {impactedGroups.map((group) => (
                      <Badge
                        key={group.groupId}
                        variant="outline"
                        className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      >
                        <Users className="h-3 w-3" />
                        {group.groupName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            {/* Seleção de estratégia */}
            <div className="space-y-4 py-2">
              <RadioGroup
                value={groupStrategy}
                onValueChange={(value) => setGroupStrategy(value as GroupStrategy)}
                className="gap-3"
              >
                {/* Opção: apenas retirar */}
                <div className="flex items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="remove_from_groups" id="strategy-remove" className="mt-0.5" />
                  <div className="grid gap-0.5">
                    <Label htmlFor="strategy-remove" className="cursor-pointer font-medium">
                      Apenas retirar do(s) grupo(s)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      O agente será removido de todas as equipes antes de ser excluído.
                    </p>
                  </div>
                </div>

                {/* Opção: substituir */}
                <div className="flex items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                  <RadioGroupItem value="replace_with_agent" id="strategy-replace" className="mt-0.5" />
                  <div className="grid gap-0.5 flex-1">
                    <Label htmlFor="strategy-replace" className="cursor-pointer font-medium">
                      Substituir por outro agente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Um agente substituto ocupará a posição nas equipes.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {/* Select do agente substituto — aparece apenas quando a estratégia for substituir */}
              {groupStrategy === 'replace_with_agent' && (
                <div className="space-y-1.5 pl-1">
                  <Label className="text-sm">Agente substituto</Label>
                  {availableReplacementAgents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum outro agente disponível para substituição.
                    </p>
                  ) : (
                    <Select value={replacementAgentId} onValueChange={setReplacementAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um agente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableReplacementAgents.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            <span className="flex items-center gap-2">
                              {candidate.name}
                              {!candidate.isActive && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Inativo
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmGroupDecision}
                disabled={
                  isDeleting ||
                  (groupStrategy === 'replace_with_agent' &&
                    (!replacementAgentId || availableReplacementAgents.length === 0))
                }
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="mr-2 h-4 w-4" />
                )}
                Confirmar Exclusão
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DeleteAgentDialog
