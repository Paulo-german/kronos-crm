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

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
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
  const watchedName = form.watch('name')
  const watchedCategory = form.watch('category')
  const watchedLanguage = form.watch('language')

  const previewBodyValues = useMemo(
    () => watchedBodyExamples ?? [],
    [watchedBodyExamples],
  )

  // O card de detalhes só aparece quando o nome foi preenchido
  const showDetailsCard = watchedName && watchedName.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl gap-0 p-0">
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
          <div className="flex-1 overflow-y-auto px-6 py-4" style={{ maxHeight: '65vh' }}>
            <Form {...form}>
              <form onSubmit={handleSubmit} id="create-template-form">
                <TemplateFormFields form={form} />
              </form>
            </Form>
          </div>

          <Separator orientation="vertical" />

          {/* Painel de preview — sticky, não scrolla com o form */}
          <div className="flex w-80 shrink-0 flex-col px-5 py-4" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
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

            {/* Card de detalhes — visível apenas quando o nome está preenchido */}
            {showDetailsCard && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Detalhes
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Nome</span>
                    <span className="max-w-[60%] break-all text-right text-xs text-foreground">
                      {watchedName}
                    </span>
                  </div>
                  {watchedCategory && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Categoria</span>
                      <span className="text-xs text-foreground">
                        {CATEGORY_LABELS[watchedCategory] ?? watchedCategory}
                      </span>
                    </div>
                  )}
                  {watchedLanguage && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Idioma</span>
                      <span className="text-xs text-foreground">{watchedLanguage}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
