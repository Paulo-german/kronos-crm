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
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import {
  forgotPasswordSchema,
  type ForgotPasswordSchema,
} from '@/_actions/auth/forgot-password/schema'
import { forgotPassword } from '@/_actions/auth/forgot-password'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'

const ForgotPasswordForm = () => {
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const { execute, isPending } = useAction(forgotPassword, {
    onSuccess: () => {
      setEmailSent(true)
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || 'Erro ao enviar email. Tente novamente.',
      )
    },
  })

  const onSubmit = (data: ForgotPasswordSchema) => {
    execute(data)
  }

  if (emailSent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Email enviado!</h2>
        <p className="text-sm text-muted-foreground">
          Se este email estiver cadastrado, você receberá um link para redefinir
          sua senha. Verifique sua caixa de entrada e spam.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4 text-left"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Digite seu email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar link de recuperação'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default ForgotPasswordForm
