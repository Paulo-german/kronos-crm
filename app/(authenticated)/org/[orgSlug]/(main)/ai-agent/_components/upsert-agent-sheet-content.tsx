'use client'

import { Dispatch, SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import { Switch } from '@/_components/ui/switch'
import { Loader2 } from 'lucide-react'
import { createAgent } from '@/_actions/agent/create-agent'
import {
  createAgentSchema,
  type CreateAgentInput,
} from '@/_actions/agent/create-agent/schema'
import type { UpdateAgentInput } from '@/_actions/agent/update-agent/schema'

interface UpsertAgentSheetContentProps {
  defaultValues?: { id: string; name: string; isActive: boolean }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateAgentInput) => void
  isUpdating?: boolean
}

const UpsertAgentSheetContent = ({
  defaultValues,
  setIsOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
}: UpsertAgentSheetContentProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateAgentInput>({
    resolver: isEditing ? undefined : zodResolver(createAgentSchema),
    defaultValues: isEditing
      ? { name: defaultValues.name, systemPrompt: 'placeholder', isActive: defaultValues.isActive }
      : { name: '', systemPrompt: '', isActive: true },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createAgent,
    {
      onSuccess: ({ data }) => {
        toast.success('Agente criado com sucesso!')
        if (data?.current && data?.limit && data.limit > 0) {
          const pct = data.current / data.limit
          if (pct >= 0.9) {
            toast.warning(
              `Você está usando ${data.current} de ${data.limit} agentes IA. Considere fazer upgrade.`,
              { duration: 6000 },
            )
          }
        }
        form.reset()
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar agente.')
      },
    },
  )

  const onSubmit = (data: CreateAgentInput) => {
    if (isEditing && defaultValues?.id) {
      // Edição rápida: envia apenas name e isActive
      onUpdate?.({ id: defaultValues.id, name: data.name, isActive: data.isActive })
    } else {
      executeCreate(data)
    }
  }

  const handleCloseDialog = () => {
    form.reset()
    setIsOpen(false)
  }

  const isPending = isCreating || isUpdatingProp

  return (
    <SheetContent className="overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Agente' : 'Novo Agente'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações básicas do agente. Para editar o prompt e demais configurações, acesse a página de detalhes.'
            : 'Preencha os dados para criar um novo agente IA.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Atendente WhatsApp" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Prompt só aparece na criação — edição completa na página de detalhes */}
          {!isEditing && (
            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt do Sistema *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o comportamento e personalidade do agente..."
                      className="min-h-[120px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border px-4 py-3">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="leading-none">
                  <FormLabel>Agente ativo</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" />
                  Salvar
                </div>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </SheetContent>
  )
}

export default UpsertAgentSheetContent
