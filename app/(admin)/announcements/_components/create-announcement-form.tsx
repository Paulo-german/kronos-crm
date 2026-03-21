'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Megaphone,
  Globe,
  Building2,
  Loader2,
  ExternalLink,
  Send,
} from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Separator } from '@/_components/ui/separator'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/_components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'
import { ScrollArea } from '@/_components/ui/scroll-area'

import { createAnnouncement } from '@/_actions/announcement/create-announcement'
import { createAnnouncementSchema } from '@/_actions/announcement/create-announcement/schema'
import type { OrganizationOptionDto } from '@/_data-access/announcement/types'

// Tipo de input do formulário (antes do transform do Zod)
type FormValues = z.input<typeof createAnnouncementSchema>

type ScopeMode = 'all' | 'select'

interface CreateAnnouncementFormProps {
  organizations: OrganizationOptionDto[]
}

export const CreateAnnouncementForm = ({ organizations }: CreateAnnouncementFormProps) => {
  const router = useRouter()
  const [scopeMode, setScopeMode] = useState<ScopeMode>('all')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      title: '',
      body: '',
      actionUrl: '',
      targetOrgIds: [],
    },
  })

  const { execute, status } = useAction(createAnnouncement, {
    onSuccess: () => {
      toast.success('Comunicado enviado com sucesso.')
      router.push('/admin/announcements')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao enviar comunicado.')
    },
  })

  const isPending = status === 'executing'

  // Valores observados para o preview e lógica de submit
  const watchedTitle = form.watch('title')
  const watchedBody = form.watch('body')
  const watchedActionUrl = form.watch('actionUrl')
  const watchedTargetOrgIds = form.watch('targetOrgIds')

  const selectedOrgCount = watchedTargetOrgIds?.length ?? 0

  // Calcular total estimado de destinatários
  const estimatedRecipients =
    scopeMode === 'all'
      ? organizations.reduce((sum, org) => sum + org.memberCount, 0)
      : organizations
          .filter((org) => watchedTargetOrgIds?.includes(org.id))
          .reduce((sum, org) => sum + org.memberCount, 0)

  const handleSubmit = form.handleSubmit(() => {
    setConfirmOpen(true)
  })

  const handleConfirmSend = () => {
    const values = form.getValues()
    execute({
      title: values.title,
      body: values.body,
      actionUrl: values.actionUrl ?? '',
      // Se escopo "todas", limpar a lista de org IDs
      targetOrgIds: scopeMode === 'all' ? [] : (values.targetOrgIds ?? []),
    })
    setConfirmOpen(false)
  }

  const toggleOrg = (orgId: string, checked: boolean) => {
    const current = form.getValues('targetOrgIds') ?? []
    if (checked) {
      form.setValue('targetOrgIds', [...current, orgId])
    } else {
      form.setValue(
        'targetOrgIds',
        current.filter((id) => id !== orgId),
      )
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Formulário */}
          <div className="space-y-6">
            {/* Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Novidades do sistema — Março 2025"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Corpo */}
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o comunicado. Esta mensagem será exibida nas notificações dos usuários..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Seja objetivo — esta mensagem aparecerá na central de notificações dos
                    usuários.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL de ação (opcional) */}
            <FormField
              control={form.control}
              name="actionUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    URL de ação{' '}
                    <span className="font-normal text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://..."
                      type="url"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Link que o usuário verá ao clicar na notificação.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Escopo */}
            <div className="space-y-4">
              <div>
                <FormLabel className="text-sm font-medium">Destinatários</FormLabel>
                <FormDescription className="mt-0.5">
                  Escolha para quais organizações o comunicado será enviado.
                </FormDescription>
              </div>

              <RadioGroup
                value={scopeMode}
                onValueChange={(value) => {
                  setScopeMode(value as ScopeMode)
                  // Limpar seleção ao trocar de modo
                  if (value === 'all') {
                    form.setValue('targetOrgIds', [])
                  }
                }}
                className="space-y-2"
              >
                <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
                  <RadioGroupItem value="all" id="scope-all" />
                  <label
                    htmlFor="scope-all"
                    className="flex flex-1 cursor-pointer items-center gap-2"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Todas as organizações</p>
                      <p className="text-xs text-muted-foreground">
                        {organizations.length} org(s) · ~
                        {organizations
                          .reduce((sum, org) => sum + org.memberCount, 0)
                          .toLocaleString('pt-BR')}{' '}
                        usuário(s)
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/40">
                  <RadioGroupItem value="select" id="scope-select" className="mt-0.5" />
                  <label
                    htmlFor="scope-select"
                    className="flex flex-1 cursor-pointer items-center gap-2"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Selecionar organizações</p>
                  </label>
                </div>
              </RadioGroup>

              {/* Lista de orgs para seleção */}
              {scopeMode === 'select' && (
                <div className="rounded-lg border border-border/60">
                  {organizations.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma organização encontrada.
                    </p>
                  ) : (
                    <ScrollArea className="h-56">
                      <div className="p-1">
                        {organizations.map((org) => {
                          const isChecked = watchedTargetOrgIds?.includes(org.id) ?? false
                          return (
                            <label
                              key={org.id}
                              htmlFor={`org-${org.id}`}
                              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
                            >
                              <Checkbox
                                id={`org-${org.id}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => toggleOrg(org.id, !!checked)}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{org.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {org.memberCount}{' '}
                                  {org.memberCount === 1 ? 'usuário' : 'usuários'}
                                </p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Aviso de validação do escopo */}
              {scopeMode === 'select' && selectedOrgCount === 0 && (
                <p className="text-xs text-destructive">
                  Selecione ao menos uma organização.
                </p>
              )}
            </div>

            {/* Botão de envio */}
            <div className="flex justify-end pt-2">
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    type="submit"
                    disabled={isPending || (scopeMode === 'select' && selectedOrgCount === 0)}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Comunicado
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar envio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Este comunicado será enviado como notificação para{' '}
                      <strong>~{estimatedRecipients.toLocaleString('pt-BR')} usuário(s)</strong>{' '}
                      {scopeMode === 'all'
                        ? 'de todas as organizações'
                        : `de ${selectedOrgCount} organização(ões) selecionada(s)`}
                      . Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmSend} disabled={isPending}>
                      {isPending ? 'Enviando...' : 'Confirmar envio'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Pré-visualização</p>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">
                      {watchedTitle || (
                        <span className="text-muted-foreground/50">Título do comunicado...</span>
                      )}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-1.5 text-[10px]">
                      Comunicado da plataforma
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="line-clamp-4 text-sm text-muted-foreground">
                  {watchedBody || (
                    <span className="italic opacity-50">
                      O corpo da mensagem aparecerá aqui...
                    </span>
                  )}
                </p>

                {watchedActionUrl && watchedActionUrl.length > 0 && (
                  <div className="mt-3">
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                      <ExternalLink className="h-3 w-3" />
                      Ver mais
                    </div>
                  </div>
                )}

                <Separator className="my-3" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Agora mesmo</span>
                  {scopeMode === 'all' ? (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Todas as orgs
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {selectedOrgCount} org(s)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resumo do escopo */}
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Resumo do envio</p>
              <ul className="mt-2 space-y-1">
                <li className="flex items-center justify-between">
                  <span>Organizações</span>
                  <span className="font-medium text-foreground">
                    {scopeMode === 'all' ? organizations.length : selectedOrgCount}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Destinatários estimados</span>
                  <span className="font-medium text-foreground">
                    ~{estimatedRecipients.toLocaleString('pt-BR')}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
}
