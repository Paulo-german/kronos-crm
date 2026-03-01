'use client'

import { Dispatch, SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { createInbox } from '@/_actions/inbox/create-inbox'
import {
  createInboxSchema,
  type CreateInboxInput,
} from '@/_actions/inbox/create-inbox/schema'
import type { UpdateInboxInput } from '@/_actions/inbox/update-inbox/schema'

interface AgentOption {
  id: string
  name: string
}

interface UpsertInboxSheetContentProps {
  defaultValues?: CreateInboxInput & { id?: string }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  agentOptions?: AgentOption[]
  onUpdate?: (data: UpdateInboxInput) => void
  isUpdating?: boolean
}

const UpsertInboxSheetContent = ({
  defaultValues,
  setIsOpen,
  agentOptions = [],
  onUpdate,
  isUpdating: isUpdatingProp = false,
}: UpsertInboxSheetContentProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateInboxInput>({
    resolver: zodResolver(createInboxSchema),
    defaultValues: defaultValues || {
      name: '',
      channel: 'WHATSAPP',
      agentId: null,
    },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createInbox,
    {
      onSuccess: ({ data }) => {
        toast.success('Caixa de entrada criada com sucesso!')
        if (data?.current && data?.limit && data.limit > 0) {
          const pct = data.current / data.limit
          if (pct >= 0.9) {
            toast.warning(
              `Voce esta usando ${data.current} de ${data.limit} caixas de entrada. Considere fazer upgrade.`,
              { duration: 6000 },
            )
          }
        }
        form.reset()
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar caixa de entrada.')
      },
    },
  )

  const onSubmit = (data: CreateInboxInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({ id: defaultValues.id, ...data })
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
          {isEditing ? 'Editar Caixa de Entrada' : 'Nova Caixa de Entrada'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações da caixa de entrada.'
            : 'Configure uma nova caixa de entrada para receber mensagens.'}
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
                  <Input placeholder="Ex: WhatsApp Vendas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canal</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isEditing}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o canal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="WEB_CHAT">Web Chat</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agente IA</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === 'none' ? null : value)
                  }
                  defaultValue={field.value ?? 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum agente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum agente</SelectItem>
                    {agentOptions.map((agent) => (
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

export default UpsertInboxSheetContent
