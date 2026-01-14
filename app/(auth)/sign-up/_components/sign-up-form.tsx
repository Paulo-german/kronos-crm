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
import InputPassword from '../../login/_components/input-password'
import { signUpSchema, SignUpSchema } from '@/_actions/auth/sign-up/schema'
import { useAction } from 'next-safe-action/hooks'
import { signUp } from '@/_actions/auth/sign-up'

const SignUpForm = () => {
  const form = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  })

  const { execute, status } = useAction(signUp, {
    onError: (error) => {
      // TODO: Adicionar toast de erro
      console.error('Erro no cadastro:', error.error.serverError)
    },
  })

  const onSubmit = (data: SignUpSchema) => {
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
                <Input placeholder="seu@email.com" {...field} />
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
            </FormItem>
          )}
        />
        <Button
          className="mt-4 w-full"
          type="submit"
          disabled={status === 'executing'}
        >
          {status === 'executing' ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>
    </Form>
  )
}

export default SignUpForm
