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
import InputPassword from '../../_components/input-password'
import {
  signUpFormSchema,
  SignUpFormSchema,
} from '@/_actions/auth/sign-up/schema'
import { useAction } from 'next-safe-action/hooks'
import { signUp } from '@/_actions/auth/sign-up'
import { PasswordChecklist } from './password-checklist'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

const SignUpForm = () => {
  const { executeRecaptcha } = useGoogleReCaptcha()

  const form = useForm<SignUpFormSchema>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  })

  const password = form.watch('password')

  const { execute, isPending } = useAction(signUp, {
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao criar conta.')
    },
  })

  const onSubmit = async (data: SignUpFormSchema) => {
    if (!executeRecaptcha) {
      toast.error('reCAPTCHA não carregado. Tente novamente.')
      return
    }

    const captchaToken = await executeRecaptcha('signup')
    execute({ ...data, captchaToken })
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4 text-left"
        onSubmit={form.handleSubmit(onSubmit)}
      >
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="comercial@email.com" {...field} />
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
        <Button className="mt-4 w-full" type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar conta'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default SignUpForm
