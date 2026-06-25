'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { createInbox } from '@/_actions/inbox/create-inbox'

// Provedores que podem disparar (todos menos o Evolution interno da plataforma)
const PROVIDER_OPTIONS = [
  { value: 'META_CLOUD', label: 'WhatsApp Cloud API (Meta, oficial)' },
  { value: 'Z_API', label: 'Z-API (não oficial)' },
  { value: 'EVOLUTION', label: 'Evolution API (servidor próprio)' },
  { value: 'EVOLUTION_GO', label: 'Evolution Go (servidor próprio)' },
] as const

const formSchema = z.object({
  name: z.string().min(2, 'Dê um nome com pelo menos 2 caracteres.'),
  connectionType: z.enum(['META_CLOUD', 'Z_API', 'EVOLUTION', 'EVOLUTION_GO'], {
    message: 'Selecione um provedor.',
  }),
})

type FormValues = z.infer<typeof formSchema>

interface CreateChannelDialogProps {
  trigger: React.ReactNode
  orgSlug: string
  withinQuota: boolean
}

export const CreateChannelDialog = ({
  trigger,
  orgSlug,
  withinQuota,
}: CreateChannelDialogProps) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', connectionType: 'META_CLOUD' },
  })

  const { execute, isPending } = useAction(createInbox, {
    onSuccess: ({ data }) => {
      if (!data?.inboxId) return
      toast.success('Canal criado. Agora conecte o número.')
      setIsOpen(false)
      form.reset()
      router.push(`/org/${orgSlug}/prospection/channels/${data.inboxId}`)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Não foi possível criar o canal.')
    },
  })

  const onSubmit = (values: FormValues) => {
    if (!withinQuota) {
      toast.error('Você atingiu o limite de canais do seu plano.')
      return
    }
    execute({
      name: values.name,
      channel: 'WHATSAPP',
      connectionType: values.connectionType,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar canal</DialogTitle>
          <DialogDescription>
            Crie um canal de WhatsApp para disparar suas campanhas. Você conecta
            o número no próximo passo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do canal *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex.: Comercial — Prospecção"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Uso interno, para você identificar o número.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="connectionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provedor *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROVIDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    A Cloud API exige templates aprovados para listas frias;
                    Z-API e Evolution enviam texto livre. Evolution exige
                    servidor próprio.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Criar canal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
