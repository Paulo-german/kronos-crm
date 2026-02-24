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
import { signInWithPassword } from '@/_actions/auth/sign-in'
import { signInSchema, SignInSchema } from '@/_actions/auth/sign-in/schema'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface LoginFormProps {
  redirectTo?: string
}

const LoginForm = ({ redirectTo }: LoginFormProps) => {
  const form = useForm<SignInSchema>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      redirectTo,
    },
  })

  const { execute, isPending } = useAction(signInWithPassword, {
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao fazer login.')
    },
  })

  const onSubmit = (data: SignInSchema) => {
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
              <Link
                href="/forgot-password"
                className="inline-block text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </FormItem>
          )}
        />
        <Button className="mt-4 w-full" type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Login'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default LoginForm
