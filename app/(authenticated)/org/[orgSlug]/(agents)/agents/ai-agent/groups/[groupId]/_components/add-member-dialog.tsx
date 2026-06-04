'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/_components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { addAgentToGroup } from '@/_actions/agent-group/add-agent-to-group'
import {
  addAgentToGroupSchema,
  type AddAgentToGroupInput,
} from '@/_actions/agent-group/add-agent-to-group/schema'
import type { AgentDto } from '@/_data-access/agent/get-agents'

interface AddMemberDialogProps {
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Agentes da org que ainda NÃO são membros desta equipe */
  availableAgents: AgentDto[]
}

export function AddMemberDialog({
  groupId,
  open,
  onOpenChange,
  availableAgents,
}: AddMemberDialogProps) {
  const form = useForm<AddAgentToGroupInput>({
    resolver: zodResolver(addAgentToGroupSchema),
    defaultValues: {
      groupId,
      agentId: '',
      scopeLabel: '',
    },
  })

  const { execute: executeAdd, isPending: isAdding } = useAction(addAgentToGroup, {
    onSuccess: () => {
      toast.success('Agente adicionado à equipe.')
      form.reset({ groupId, agentId: '', scopeLabel: '' })
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao adicionar agente.')
    },
  })

  const onSubmit = (data: AddAgentToGroupInput) => {
    executeAdd(data)
  }

  const handleClose = () => {
    form.reset({ groupId, agentId: '', scopeLabel: '' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar worker</DialogTitle>
          <DialogDescription>
            Selecione um agente e defina o escopo de atuação dele nesta equipe.
            O router usará essa descrição para classificar conversas.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="agentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um agente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableAgents.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          Todos os agentes já são membros desta equipe.
                        </div>
                      ) : (
                        availableAgents.map((agent) => (
                          <SelectItem
                            key={agent.id}
                            value={agent.id}
                            disabled={!agent.isActive}
                          >
                            <span className={!agent.isActive ? 'opacity-50' : ''}>
                              {agent.name}
                              {!agent.isActive && ' (inativo)'}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scopeLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escopo de atuação</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Especializado em suporte técnico e resolução de problemas"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Descrição curta usada pelo router para decidir quando direcionar para este agente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isAdding}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isAdding || availableAgents.length === 0}>
                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar worker
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
