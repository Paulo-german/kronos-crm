'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { z } from 'zod'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import {
  Card,
  CardContent,
} from '@/_components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { seedOrganization } from '@/_actions/onboarding/seed-organization'
import { seedOrganizationSchema } from '@/_actions/onboarding/seed-organization/schema'

type FormValues = z.infer<typeof seedOrganizationSchema>

interface SetupStepProps {
  onComplete: () => void
}

export function SetupStep({ onComplete }: SetupStepProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(seedOrganizationSchema),
    defaultValues: {
      agentName: '',
      companyName: '',
      companyDescription: '',
    },
  })

  const { execute, isPending } = useAction(seedOrganization, {
    onSuccess: () => {
      toast.success('Configuração finalizada!')
      onComplete()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao finalizar configuração.')
    },
  })

  const onSubmit = (values: FormValues) => {
    execute(values)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-center">
      <h2 className="text-2xl font-bold tracking-tight">
        Configure seu assistente
      </h2>
      <p className="text-muted-foreground">
        Todos os campos são opcionais. Você pode ajustar essas configurações
        depois.
      </p>

      <Card className="mx-auto max-w-lg">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agentName"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel>Nome do assistente</FormLabel>
                    <FormControl>
                      <Input placeholder="Assistente Kronos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel>Nome da empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da sua empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyDescription"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel>Descrição da empresa</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva brevemente o que sua empresa faz..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-center pt-2">
                <Button type="submit" size="lg" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Finalizar configuração
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
