'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, Mail } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/_components/ui/button'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

import { inviteProfessional } from '@/_actions/professional/invite-professional'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'

const formSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
})

type FormValues = z.infer<typeof formSchema>

interface InviteProfessionalDialogContentProps {
  professional: ProfessionalDto
  onClose: () => void
}

const InviteProfessionalDialogContent = ({
  professional,
  onClose,
}: InviteProfessionalDialogContentProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  const { execute, isPending } = useAction(inviteProfessional, {
    onSuccess: () => {
      toast.success(`Convite enviado para ${form.getValues('email')}!`)
      onClose()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao enviar convite.')
    },
  })

  const handleSubmit = (data: FormValues) => {
    execute({ professionalId: professional.id, email: data.email })
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Convidar {professional.name}</DialogTitle>
        <DialogDescription>
          Envie um convite por e-mail para que o profissional acesse a própria
          agenda no Kronos Hub.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail do profissional</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="nome@exemplo.com"
                      type="email"
                      className="pl-9"
                      autoFocus
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar convite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}

export default InviteProfessionalDialogContent
