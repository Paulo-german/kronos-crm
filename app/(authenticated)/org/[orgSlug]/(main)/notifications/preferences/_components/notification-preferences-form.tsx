'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/_components/ui/form'
import { Switch } from '@/_components/ui/switch'
import { Button } from '@/_components/ui/button'
import { Separator } from '@/_components/ui/separator'
import { updateNotificationPreferences } from '@/_actions/notification/update-notification-preferences'
import {
  notificationPreferencesSchema,
  type NotificationPreferences,
} from '@/_data-access/notification/types'

interface NotificationPreferencesFormProps {
  preferences: NotificationPreferences
}

interface SwitchRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const SwitchRow = ({ label, description, checked, onChange, disabled }: SwitchRowProps) => (
  <div className={`flex items-center justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}>
    <div className="space-y-0.5">
      <p className="text-sm font-medium leading-none">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
)

export const NotificationPreferencesForm = ({ preferences }: NotificationPreferencesFormProps) => {
  const form = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: preferences,
  })

  const { execute, isPending } = useAction(updateNotificationPreferences, {
    onSuccess: () => {
      toast.success('Preferências salvas com sucesso!')
      form.reset(form.getValues())
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar preferências.')
    },
  })

  const onSubmit = (data: NotificationPreferences) => {
    execute(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Notificações in-app */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notificações no aplicativo</CardTitle>
            <CardDescription>
              Escolha quais tipos de notificações você deseja receber dentro do Kronos CRM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="inApp.system"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SwitchRow
                      label="Alertas do sistema"
                      description="Avisos sobre conexões desconectadas, tokens expirados e eventos críticos."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="inApp.userAction"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SwitchRow
                      label="Ações de outros usuários"
                      description="Notificações quando deals são transferidos para você ou tarefas são atribuídas."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="inApp.platformAnnouncement"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SwitchRow
                      label="Comunicados da plataforma"
                      description="Novidades, atualizações e anúncios importantes do Kronos CRM."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Outros canais - Em breve */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Outros canais</CardTitle>
                <CardDescription>Receba notificações por outros meios.</CardDescription>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Em breve
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow
              label="Email"
              description="Receba um resumo das notificações no seu email."
              checked={false}
              onChange={() => {}}
              disabled
            />

            <Separator />

            <SwitchRow
              label="WhatsApp"
              description="Receba alertas importantes diretamente no WhatsApp."
              checked={false}
              onChange={() => {}}
              disabled
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !form.formState.isDirty}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Salvar preferências
          </Button>
        </div>
      </form>
    </Form>
  )
}
