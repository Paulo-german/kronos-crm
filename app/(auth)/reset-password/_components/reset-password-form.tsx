'use client'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/_components/ui/button'
import InputPassword from '@/(auth)/_components/input-password'
import {
  resetPasswordSchema,
  type ResetPasswordSchema,
} from '@/_actions/auth/reset-password/schema'
import { resetPassword } from '@/_actions/auth/reset-password'
import { PasswordChecklist } from '@/(auth)/sign-up/_components/password-checklist'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const ResetPasswordForm = () => {
  const router = useRouter()

  const form = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const password = form.watch('password')

  const { execute, isPending } = useAction(resetPassword, {
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso! Faça login com sua nova senha.')
      router.push('/login')
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Erro ao redefinir senha. Tente novamente.',
      )
    },
  })

  const onSubmit = (data: ResetPasswordSchema) => {
    execute(data)
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4 text-left"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova senha</FormLabel>
              <FormControl>
                <InputPassword {...field} placeholder="Digite sua nova senha" />
              </FormControl>
              <FormMessage />
              <PasswordChecklist value={password} />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar nova senha</FormLabel>
              <FormControl>
                <InputPassword
                  {...field}
                  placeholder="Confirme sua nova senha"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redefinindo...
            </>
          ) : (
            'Redefinir senha'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default ResetPasswordForm
