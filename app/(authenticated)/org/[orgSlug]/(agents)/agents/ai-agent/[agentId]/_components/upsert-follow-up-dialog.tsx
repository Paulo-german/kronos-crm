'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Separator } from '@/_components/ui/separator'
import { upsertFollowUp } from '@/_actions/follow-up/upsert-follow-up'
import { upsertFollowUpSchema } from '@/_actions/follow-up/upsert-follow-up/schema'
import type { AgentStepDto } from '@/_data-access/agent/get-agent-by-id'
import type { FollowUpDto } from '@/_data-access/follow-up/types'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const DELAY_PRESETS = [
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '2 horas', value: 120 },
  { label: '6 horas', value: 360 },
  { label: '12 horas', value: 720 },
  { label: '24 horas', value: 1440 },
  { label: '48 horas', value: 2880 },
  { label: '7 dias', value: 10080 },
] as const

// z.input<> captura o tipo ANTES dos defaults do Zod (isActive optional),
// que é o tipo correto para useForm / react-hook-form.
type FormValues = z.input<typeof upsertFollowUpSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UpsertFollowUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string
  agentSteps: AgentStepDto[]
  followUp: FollowUpDto | null
  nextOrder: number
  onSaveSuccess?: () => void
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

const UpsertFollowUpDialog = ({
  open,
  onOpenChange,
  agentId,
  agentSteps,
  followUp,
  nextOrder,
  onSaveSuccess,
}: UpsertFollowUpDialogProps) => {
  const isEditing = Boolean(followUp)

  const defaultValues: FormValues = {
    id: followUp?.id,
    agentId,
    delayMinutes: followUp?.delayMinutes ?? 30,
    messageContent: followUp?.messageContent ?? '',
    isActive: followUp?.isActive ?? true,
    agentStepIds: followUp?.agentStepIds ?? [],
    order: followUp?.order ?? nextOrder,
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(upsertFollowUpSchema),
    defaultValues,
  })

  // Reseta o form ao abrir/fechar ou trocar de follow-up (uso legítimo de useEffect)
  useEffect(() => {
    if (open) {
      form.reset({
        id: followUp?.id,
        agentId,
        delayMinutes: followUp?.delayMinutes ?? 30,
        messageContent: followUp?.messageContent ?? '',
        isActive: followUp?.isActive ?? true,
        agentStepIds: followUp?.agentStepIds ?? [],
        order: followUp?.order ?? nextOrder,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, followUp?.id])

  const { execute, isPending } = useAction(upsertFollowUp, {
    onSuccess: () => {
      toast.success(isEditing ? 'Follow-up atualizado!' : 'Follow-up criado!')
      onSaveSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao salvar follow-up.')
    },
  })

  const handleSubmit = (values: FormValues) => {
    execute(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>
            {isEditing ? 'Editar Follow-Up' : 'Novo Follow-Up'}
          </DialogTitle>
          <DialogDescription>
            Configure uma mensagem automática enviada quando o cliente não responde.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6">
              <div className="space-y-5 py-4">
                {/* Delay */}
                <FormField
                  control={form.control}
                  name="delayMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enviar após</FormLabel>
                      <FormControl>
                        <Select
                          value={String(field.value)}
                          onValueChange={(val) => field.onChange(Number(val))}
                          disabled={isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar intervalo" />
                          </SelectTrigger>
                          <SelectContent>
                            {DELAY_PRESETS.map((preset) => (
                              <SelectItem
                                key={preset.value}
                                value={String(preset.value)}
                              >
                                {preset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mensagem */}
                <FormField
                  control={form.control}
                  name="messageContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Olá! Percebemos que você não respondeu. Posso ajudá-lo?"
                          className="min-h-[120px] resize-none"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-[0.75rem] text-muted-foreground">
                        {field.value?.length ?? 0}/1000 caracteres
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Etapas do agente */}
                <FormField
                  control={form.control}
                  name="agentStepIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etapas do agente</FormLabel>
                      <p className="text-[0.8rem] text-muted-foreground">
                        Selecione em quais etapas este follow-up será acionado.
                      </p>
                      <FormControl>
                        <div className="space-y-2 rounded-md border border-border/50 p-3">
                          {agentSteps.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Nenhuma etapa configurada no agente.
                            </p>
                          ) : (
                            agentSteps.map((step) => {
                              const isChecked = field.value.includes(step.id)
                              return (
                                <label
                                  key={step.id}
                                  className="flex cursor-pointer items-center gap-2.5 rounded-sm p-1 hover:bg-muted/50"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    disabled={isPending}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, step.id])
                                      } else {
                                        field.onChange(
                                          field.value.filter((id) => id !== step.id),
                                        )
                                      }
                                    }}
                                  />
                                  <span className="text-sm">
                                    <span className="mr-2 text-xs font-bold text-muted-foreground">
                                      #{step.order + 1}
                                    </span>
                                    {step.name}
                                  </span>
                                </label>
                              )
                            })
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <DialogFooter className="px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  'Atualizar'
                ) : (
                  'Criar Follow-Up'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default UpsertFollowUpDialog
