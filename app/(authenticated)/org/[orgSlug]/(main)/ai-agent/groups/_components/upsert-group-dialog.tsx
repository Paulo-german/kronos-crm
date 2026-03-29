'use client'

import { Dispatch, SetStateAction, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { PlusIcon, TrashIcon, Loader2 } from 'lucide-react'
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/_components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Separator } from '@/_components/ui/separator'
import { createAgentGroup } from '@/_actions/agent-group/create-agent-group'
import {
  createAgentGroupSchema,
  type CreateAgentGroupInput,
} from '@/_actions/agent-group/create-agent-group/schema'
import type { AgentDto } from '@/_data-access/agent/get-agents'

interface UpsertGroupSheetContentProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>
  agents: AgentDto[]
}

export function UpsertGroupSheetContent({ setIsOpen, agents }: UpsertGroupSheetContentProps) {
  const form = useForm<CreateAgentGroupInput>({
    resolver: zodResolver(createAgentGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      routerModelId: 'google/gemini-2.0-flash',
      routerPrompt: '',
      members: [{ agentId: '', scopeLabel: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'members',
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(createAgentGroup, {
    onSuccess: ({ data }) => {
      toast.success('Equipe criada com sucesso!')
      if (data?.current && data?.limit && data.limit > 0) {
        const pct = data.current / data.limit
        if (pct >= 0.9) {
          toast.warning(
            `Você está usando ${data.current} de ${data.limit} equipes. Considere fazer upgrade.`,
            { duration: 6000 },
          )
        }
      }
      form.reset()
      setIsOpen(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao criar equipe.')
    },
  })

  const onSubmit = (data: CreateAgentGroupInput) => {
    executeCreate(data)
  }

  const handleClose = useCallback(() => {
    form.reset()
    setIsOpen(false)
  }, [form, setIsOpen])

  // Agentes já selecionados em outros campos (para evitar duplicatas)
  const selectedAgentIds = form.watch('members').map((member) => member.agentId)

  return (
    <SheetContent className="overflow-y-auto sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>Criar Equipe de Agentes</SheetTitle>
        <SheetDescription>
          Configure uma equipe com múltiplos agentes workers. O router embutido vai direcionar
          automaticamente cada conversa para o agente mais adequado.
        </SheetDescription>
      </SheetHeader>

      <Separator className="my-4" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome da equipe */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da equipe</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Equipe Comercial" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Descrição */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva o propósito desta equipe..."
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Agentes workers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium leading-none">Agentes Workers</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ agentId: '', scopeLabel: '' })}
                className="h-7 gap-1 text-xs"
              >
                <PlusIcon className="h-3 w-3" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Worker {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name={`members.${index}.agentId`}
                    render={({ field: agentField }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Agente</FormLabel>
                        <Select
                          onValueChange={agentField.onChange}
                          value={agentField.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um agente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agents
                              .filter(
                                (agent) =>
                                  agent.isActive &&
                                  (agentField.value === agent.id ||
                                    !selectedAgentIds.includes(agent.id)),
                              )
                              .map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`members.${index}.scopeLabel`}
                    render={({ field: scopeField }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Escopo (para o router)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Especializado em propostas comerciais"
                            {...scopeField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            {form.formState.errors.members?.root && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.members.root.message}
              </p>
            )}
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Equipe
            </Button>
          </div>
        </form>
      </Form>
    </SheetContent>
  )
}
