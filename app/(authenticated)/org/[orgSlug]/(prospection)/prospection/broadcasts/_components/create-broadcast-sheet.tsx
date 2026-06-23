'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/_components/ui/sheet'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { createBroadcast } from '@/_actions/broadcast/create-broadcast'
import { listWhatsAppTemplates } from '@/_actions/inbox/list-whatsapp-templates'
import type { EligibleInbox } from '@/_data-access/broadcast/get-eligible-inboxes'
import type { BroadcastContactOption } from '@/_actions/broadcast/search-broadcast-contacts'
import type { MetaTemplate } from '@/_lib/meta/types'
import { getConnectionLabel } from '../../_lib/broadcast-labels'
import { ContactMultiSelect } from './contact-multi-select'

const MAX_MESSAGE_LENGTH = 4096

const THROTTLE_PRESETS: { value: string; label: string }[] = [
  { value: '3000', label: 'Lento — 1 msg / 3s (mais seguro)' },
  { value: '1500', label: 'Normal — 1 msg / 1,5s' },
  { value: '500', label: 'Rápido — 1 msg / 0,5s (maior risco)' },
]

const formSchema = z.object({
  inboxId: z.string().min(1, 'Selecione um canal de origem.'),
  name: z.string().min(2, 'Dê um nome com pelo menos 2 caracteres.'),
  messageContent: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  throttleMs: z.number().int(),
  scheduledFor: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateBroadcastSheetProps {
  trigger: React.ReactNode
  inboxes: EligibleInbox[]
}

export const CreateBroadcastSheet = ({
  trigger,
  inboxes,
}: CreateBroadcastSheetProps) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<
    BroadcastContactOption[]
  >([])
  const [templates, setTemplates] = useState<MetaTemplate[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inboxId: '',
      name: '',
      messageContent: '',
      templateName: '',
      templateLanguage: '',
      throttleMs: 1500,
      scheduledFor: '',
    },
  })

  const inboxId = form.watch('inboxId')
  const messageValue = form.watch('messageContent') ?? ''
  const scheduledForValue = form.watch('scheduledFor')
  const templateName = form.watch('templateName')
  const templateLanguage = form.watch('templateLanguage')

  const selectedInbox = inboxes.find((inbox) => inbox.id === inboxId)
  const isMeta = selectedInbox?.connectionType === 'META_CLOUD'

  const { execute: fetchTemplates, isPending: isFetchingTemplates } = useAction(
    listWhatsAppTemplates,
    {
      onSuccess: ({ data }) => {
        setTemplates(
          (data ?? []).filter((template) => template.status === 'APPROVED'),
        )
      },
      onError: () => {
        setTemplates([])
        toast.error('Não foi possível carregar os templates desta caixa.')
      },
    },
  )

  const { execute, isPending } = useAction(createBroadcast, {
    onSuccess: ({ data }) => {
      if (!data?.success) return
      const queued = data.totalRecipients - data.skippedCount
      const parts = [`${queued.toLocaleString('pt-BR')} na fila`]
      if (data.skippedCount > 0) parts.push(`${data.skippedCount} ignorado(s)`)
      if (data.notFoundCount > 0)
        parts.push(`${data.notFoundCount} não encontrado(s)`)
      toast.success(`Disparo criado — ${parts.join(', ')}.`)
      form.reset()
      setSelectedContacts([])
      setTemplates([])
      setIsOpen(false)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Não foi possível criar o disparo.')
    },
  })

  const handleInboxChange = (value: string) => {
    form.setValue('inboxId', value)
    form.setValue('templateName', '')
    form.setValue('templateLanguage', '')
    setTemplates([])
    const inbox = inboxes.find((item) => item.id === value)
    if (inbox?.connectionType === 'META_CLOUD') {
      fetchTemplates({ inboxId: value })
    }
  }

  const handleTemplateChange = (value: string) => {
    const [name, language] = value.split('|')
    form.setValue('templateName', name)
    form.setValue('templateLanguage', language)
  }

  const onSubmit = (values: FormValues) => {
    if (selectedContacts.length === 0) {
      toast.error('Selecione ao menos um contato.')
      return
    }
    if (isMeta && !values.templateName) {
      toast.error('Selecione um template aprovado.')
      return
    }
    if (!isMeta && !values.messageContent?.trim()) {
      form.setError('messageContent', { message: 'Escreva a mensagem.' })
      return
    }

    execute({
      inboxId: values.inboxId,
      name: values.name,
      contactIds: selectedContacts.map((contact) => contact.id),
      throttleMs: values.throttleMs,
      messageContent: isMeta ? undefined : values.messageContent,
      templateName: isMeta ? values.templateName : undefined,
      templateLanguage: isMeta ? values.templateLanguage : undefined,
      scheduledFor: values.scheduledFor
        ? new Date(values.scheduledFor)
        : undefined,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Novo disparo</SheetTitle>
          <SheetDescription>
            Envie uma mensagem para vários contatos via WhatsApp.
          </SheetDescription>
        </SheetHeader>

        {inboxes.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma caixa de entrada elegível. Conecte um WhatsApp (Evolution,
            Meta Cloud ou Z-API) para disparar.
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-5"
            >
              <FormField
                control={form.control}
                name="inboxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal de origem *</FormLabel>
                    <Select
                      onValueChange={handleInboxChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o WhatsApp de envio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inboxes.map((inbox) => (
                          <SelectItem key={inbox.id} value={inbox.id}>
                            {inbox.name} ·{' '}
                            {getConnectionLabel(inbox.connectionType)}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do disparo *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: Black Friday — Leads frios"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Uso interno, só você e sua equipe veem.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Destinatários *</Label>
                <ContactMultiSelect
                  selected={selectedContacts}
                  onChange={setSelectedContacts}
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  Contatos sem telefone, anonimizados ou com opt-out são
                  ignorados automaticamente.
                </p>
              </div>

              {isMeta ? (
                <div className="space-y-2">
                  <Label>Template aprovado *</Label>
                  <Select
                    onValueChange={handleTemplateChange}
                    value={
                      templateName ? `${templateName}|${templateLanguage}` : ''
                    }
                    disabled={isFetchingTemplates}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isFetchingTemplates
                            ? 'Carregando templates...'
                            : 'Selecione um template aprovado'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={`${template.name}|${template.language}`}
                        >
                          {template.name} ({template.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isFetchingTemplates && templates.length === 0 && (
                    <p className="text-[0.8rem] text-muted-foreground">
                      Nenhum template aprovado nesta caixa. Crie e aprove um
                      template na Meta antes de disparar.
                    </p>
                  )}
                  <p className="text-[0.8rem] text-muted-foreground">
                    A Meta exige template aprovado para mensagens fora da janela
                    de 24h (o caso de listas frias).
                  </p>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="messageContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escreva a mensagem que será enviada..."
                          rows={6}
                          maxLength={MAX_MESSAGE_LENGTH}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-muted-foreground">
                          {messageValue.length}/{MAX_MESSAGE_LENGTH}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="throttleMs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Velocidade de envio</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {THROTTLE_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Intervalos maiores reduzem o risco de bloqueio do número.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agendar para</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      Deixe em branco para enviar imediatamente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  {scheduledForValue ? 'Agendar disparo' : 'Criar disparo'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}
