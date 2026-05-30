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
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Separator } from '@/_components/ui/separator'
import { createCaptureForm } from '@/_actions/capture-form/create-capture-form'
import { createCaptureFormSchema, updateCaptureFormSchema } from '@/_actions/capture-form/schema'
import { DEFAULT_CAPTURE_FIELDS, CAPTURE_FIELD_KEYS, type CaptureFieldKey } from '@/_lib/capture-form/field-config'
import type { CaptureFormDto } from '@/_data-access/capture-form/get-capture-forms'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

type CreateInput = z.infer<typeof createCaptureFormSchema>
type UpdateInput = z.infer<typeof updateCaptureFormSchema>

interface UpsertCaptureFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: CaptureFormDto
  members: AcceptedMemberDto[]
  onUpdate?: (data: UpdateInput) => void
  isUpdating?: boolean
}

const FIELD_LABELS: Record<CaptureFieldKey, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  role: 'Cargo',
}

const FORM_DEFAULTS: CreateInput = {
  name: '',
  fields: DEFAULT_CAPTURE_FIELDS,
  buttonLabel: 'Enviar',
  successMessage: 'Obrigado! Recebemos seus dados.',
  redirectUrl: '',
  assignedTo: undefined,
  isActive: true,
}

export const UpsertCaptureFormDialog = ({
  open,
  onOpenChange,
  defaultValues,
  members,
  onUpdate,
  isUpdating = false,
}: UpsertCaptureFormDialogProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateInput>({
    resolver: zodResolver(createCaptureFormSchema),
    defaultValues: FORM_DEFAULTS,
  })

  useEffect(() => {
    if (!open) return
    if (defaultValues) {
      form.reset({
        name: defaultValues.name,
        fields: defaultValues.fields,
        buttonLabel: defaultValues.buttonLabel,
        successMessage: defaultValues.successMessage,
        redirectUrl: defaultValues.redirectUrl ?? '',
        assignedTo: defaultValues.assignedTo ?? undefined,
        isActive: defaultValues.isActive,
      })
      return
    }
    form.reset(FORM_DEFAULTS)
  }, [open, defaultValues, form])

  const { execute: executeCreate, isExecuting: isCreating } = useAction(createCaptureForm, {
    onSuccess: () => {
      toast.success('Formulário criado com sucesso.')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar formulário.')
    },
  })

  const onSubmit = (data: CreateInput) => {
    if (isEditing && onUpdate) {
      onUpdate({ ...data, id: defaultValues!.id })
      return
    }
    executeCreate(data)
  }

  const isPending = isCreating || isUpdating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar formulário' : 'Novo formulário de captura'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome interno</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Landing Page Produto X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Campos do formulário</p>
              <div className="space-y-2">
                {CAPTURE_FIELD_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-4 rounded-md border p-3">
                    <span className="w-20 text-sm text-muted-foreground">{FIELD_LABELS[key]}</span>
                    <div className="flex flex-1 items-center gap-6">
                      <FormField
                        control={form.control}
                        name={`fields.${key}.visible`}
                        render={({ field: f }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={f.value}
                                onCheckedChange={f.onChange}
                                disabled={key === 'name'}
                              />
                            </FormControl>
                            <FormLabel className="text-xs text-muted-foreground">Visível</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`fields.${key}.required`}
                        render={({ field: f }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={f.value}
                                onCheckedChange={f.onChange}
                                disabled={key === 'name'}
                              />
                            </FormControl>
                            <FormLabel className="text-xs text-muted-foreground">Obrigatório</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="buttonLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto do botão</FormLabel>
                    <FormControl>
                      <Input placeholder="Enviar" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável padrão</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                      value={field.value ?? 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {members.filter((member) => member.userId !== null).map((member) => (
                          <SelectItem key={member.userId!} value={member.userId!}>
                            {member.user?.fullName ?? member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="successMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem de sucesso</FormLabel>
                  <FormControl>
                    <Input placeholder="Obrigado! Recebemos seus dados." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="redirectUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de redirecionamento (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar formulário'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
