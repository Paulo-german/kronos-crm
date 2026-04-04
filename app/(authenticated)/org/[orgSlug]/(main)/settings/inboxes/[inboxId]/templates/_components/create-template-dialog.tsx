'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import { Form } from '@/_components/ui/form'
import { ScrollArea } from '@/_components/ui/scroll-area'
import { Separator } from '@/_components/ui/separator'
import { createWhatsAppTemplate } from '@/_actions/inbox/create-whatsapp-template'
import {
  createWhatsAppTemplateSchema,
  type CreateWhatsAppTemplateInput,
} from '@/_actions/inbox/create-whatsapp-template/schema'
import { TemplateFormFields } from './template-form-fields'
import { TemplatePreview } from './template-preview'

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inboxId: string
  onCreated: () => void
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  inboxId,
  onCreated,
}: CreateTemplateDialogProps) {
  const form = useForm<CreateWhatsAppTemplateInput>({
    resolver: zodResolver(createWhatsAppTemplateSchema),
    defaultValues: {
      inboxId,
      name: '',
      language: 'pt_BR',
      category: 'UTILITY',
      components: {
        body: { text: '', examples: [] },
      },
    },
  })

  const { execute, isPending } = useAction(createWhatsAppTemplate, {
    onSuccess: () => {
      toast.success('Template criado! Aguardando aprovação do Meta.')
      form.reset()
      onOpenChange(false)
      onCreated()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar o template.')
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    execute(data)
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset()
    onOpenChange(nextOpen)
  }

  // Dados observados para o preview em tempo real — derivação inline, zero useEffect
  const watchedHeaderFormat = form.watch('components.header.format')
  const watchedHeaderText = form.watch('components.header.text')
  const watchedBodyText = form.watch('components.body.text')
  const watchedFooterText = form.watch('components.footer.text')
  const watchedBodyExamples = form.watch('components.body.examples')

  const previewBodyValues = useMemo(
    () => watchedBodyExamples ?? [],
    [watchedBodyExamples],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Criar template</DialogTitle>
          <DialogDescription>
            Templates precisam ser aprovados pelo Meta antes de serem usados.
            O processo de aprovação pode levar alguns minutos.
          </DialogDescription>
        </DialogHeader>

        <Separator className="mt-4" />

        <div className="flex min-h-0 flex-1">
          {/* Formulário */}
          <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: '65vh' }}>
            <Form {...form}>
              <form onSubmit={handleSubmit} id="create-template-form">
                <TemplateFormFields form={form} />
              </form>
            </Form>
          </ScrollArea>

          <Separator orientation="vertical" />

          {/* Preview ao vivo */}
          <div className="w-72 shrink-0 px-4 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </p>
            <TemplatePreview
              headerFormat={watchedHeaderFormat}
              headerText={watchedHeaderText ?? undefined}
              bodyText={watchedBodyText}
              footerText={watchedFooterText ?? undefined}
              bodyVariableValues={previewBodyValues}
            />
          </div>
        </div>

        <Separator />

        <DialogFooter className="px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="create-template-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Criar template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
