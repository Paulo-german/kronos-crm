'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import {
  registerAndAcceptProfessionalInviteSchema,
  type RegisterAndAcceptProfessionalInviteSchema,
} from '@/_actions/auth/register-and-accept-professional-invite/schema'
import { registerAndAcceptProfessionalInvite } from '@/_actions/auth/register-and-accept-professional-invite'
import { PasswordChecklist } from '@/(auth)/sign-up/_components/password-checklist'
import InputPassword from '@/(auth)/_components/input-password'
import { KronosLogo } from '@/_components/icons/kronos-logo'

import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'

interface ProfessionalInviteRegisterFormProps {
  token: string
  email: string
  orgName: string
}

export function ProfessionalInviteRegisterForm({
  token,
  email,
  orgName,
}: ProfessionalInviteRegisterFormProps) {
  const form = useForm<RegisterAndAcceptProfessionalInviteSchema>({
    resolver: zodResolver(registerAndAcceptProfessionalInviteSchema),
    defaultValues: {
      token,
      fullName: '',
      password: '',
    },
  })

  const password = form.watch('password')

  const { execute, isPending } = useAction(registerAndAcceptProfessionalInvite, {
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao criar conta.')
    },
  })

  return (
    <>
      {/* Logo + Nome */}
      <div className="flex items-center gap-2">
        <KronosLogo className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold tracking-wide">KRONOS</span>
      </div>

      {/* Título */}
      <h1 className="mt-8 text-2xl font-bold">Crie sua conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você foi convidado para a agenda de <strong>{orgName}</strong>
      </p>

      {/* Formulário */}
      <div className="mt-6">
        <Form {...form}>
          <form
            className="space-y-4 text-left"
            onSubmit={form.handleSubmit((data) => execute(data))}
          >
            {/* Email read-only */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Email</label>
              <Input value={email} disabled />
            </div>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <InputPassword {...field} />
                  </FormControl>
                  <FormMessage />
                  <PasswordChecklist value={password} />
                </FormItem>
              )}
            />

            <Button
              className="mt-4 w-full"
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta e aceitar convite'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </>
  )
}
