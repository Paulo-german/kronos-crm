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

import z from 'zod'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import InputPassword from './input-password'
import { signInWithPassword } from '@/_actions/auth/sign-in'
import { SignInSchema } from '@/_actions/auth/sign-in/schema'
import { useAction } from 'next-safe-action/hooks'

const loginSchema = z.object({
  email: z.string().email({
    message: 'É necessário um email valido.',
  }),
  password: z.string().min(6, {
    message: 'A senha deve conter pelo menos 6 caracteres.',
  }),
})

const LoginForm = () => {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const { execute } = useAction(signInWithPassword, {
    onError: (error) => {
      // TODO: Adicionar toast de erro
      console.error('Erro no cadastro:', error.error.serverError)
    },
  })

  const onSubmit = (data: SignInSchema) => {
    console.log(data)
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
            </FormItem>
          )}
        />
        <Button className="mt-4 w-full" type="submit">
          Login
        </Button>
      </form>
    </Form>
  )
}

export default LoginForm
