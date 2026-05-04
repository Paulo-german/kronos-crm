'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/_components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { inviteMember } from '@/_actions/organization/invite-member'

const inviteSupportSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

type InviteSupportSchema = z.infer<typeof inviteSupportSchema>

export function InviteSupportDialog() {
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<InviteSupportSchema>({
    resolver: zodResolver(inviteSupportSchema),
    defaultValues: { email: '' },
  })

  const { execute, isPending } = useAction(inviteMember, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success('Convite de suporte enviado com sucesso.')
        form.reset()
        setIsOpen(false)
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao enviar convite de suporte.')
    },
  })

  const onSubmit = (data: InviteSupportSchema) => {
    execute({ email: data.email, role: 'SUPPORT' })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Convidar Suporte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Agente de Suporte</DialogTitle>
          <DialogDescription>
            Insira o e-mail de um agente de suporte habilitado pelo time Kronos. Ele terá acesso completo à organização, exceto billing e configurações de membros.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail do agente</FormLabel>
                  <FormControl>
                    <Input placeholder="suporte@kronoshub.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Convite'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
