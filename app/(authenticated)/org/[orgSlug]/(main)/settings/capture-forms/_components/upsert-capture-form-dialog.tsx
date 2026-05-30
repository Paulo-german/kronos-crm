'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, Users, CheckIcon } from 'lucide-react'
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
import { Badge } from '@/_components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Checkbox } from '@/_components/ui/checkbox'
import { Separator } from '@/_components/ui/separator'
import { createCaptureForm } from '@/_actions/capture-form/create-capture-form'
import { captureFormBaseSchema, updateCaptureFormSchema } from '@/_actions/capture-form/schema'
import { DEFAULT_CAPTURE_FIELDS, CAPTURE_FIELD_KEYS, type CaptureFieldKey } from '@/_lib/capture-form/field-config'
import type { CaptureFormDto } from '@/_data-access/capture-form/get-capture-forms'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { SquadDto } from '@/_data-access/squad/get-squads'

type CreateInput = z.infer<typeof captureFormBaseSchema>
type UpdateInput = z.infer<typeof updateCaptureFormSchema>

interface UpsertCaptureFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: CaptureFormDto
  members: AcceptedMemberDto[]
  squads: SquadDto[]
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
  distributionUserIds: [],
  squadId: null,
  isActive: true,
}

export const UpsertCaptureFormDialog = ({
  open,
  onOpenChange,
  defaultValues,
  members,
  squads,
  onUpdate,
  isUpdating = false,
}: UpsertCaptureFormDialogProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateInput>({
    resolver: zodResolver(captureFormBaseSchema),
    defaultValues: FORM_DEFAULTS,
  })

  const distributionUserIds = form.watch('distributionUserIds')
  const squadId = form.watch('squadId')

  const assignableMembers = members.filter((member) => member.userId !== null)

  useEffect(() => {
    if (!open) return
    if (defaultValues) {
      form.reset({
        name: defaultValues.name,
        fields: defaultValues.fields,
        buttonLabel: defaultValues.buttonLabel,
        successMessage: defaultValues.successMessage,
        redirectUrl: defaultValues.redirectUrl ?? '',
        distributionUserIds: defaultValues.distributionUserIds,
        squadId: defaultValues.squadId ?? null,
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

  const handleToggleMember = (userId: string) => {
    const current = form.getValues('distributionUserIds')
    const updated = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]
    form.setValue('distributionUserIds', updated, { shouldDirty: true })
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

            {/* Distribuição de leads */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Distribuição de leads</p>
                <p className="text-xs text-muted-foreground">
                  Escolha membros (round-robin) ou um time. Os dois modos são exclusivos.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Select de Squad */}
                <FormField
                  control={form.control}
                  name="squadId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === 'none' ? null : value)
                        }
                        value={field.value ?? 'none'}
                        disabled={distributionUserIds.length > 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem time</SelectItem>
                          {squads.map((squad) => (
                            <SelectItem key={squad.id} value={squad.id}>
                              {squad.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Multi-select de membros */}
                <FormItem>
                  <FormLabel>Membros específicos</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                        disabled={!!squadId}
                      >
                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                        {distributionUserIds.length === 0
                          ? 'Selecionar membros'
                          : `${distributionUserIds.length} membro(s)`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      {assignableMembers.length === 0 ? (
                        <p className="px-2 py-1 text-sm text-muted-foreground">
                          Nenhum membro disponível.
                        </p>
                      ) : (
                        assignableMembers.map((member) => {
                          const isSelected = distributionUserIds.includes(member.userId!)
                          return (
                            <button
                              key={member.userId}
                              type="button"
                              onClick={() => handleToggleMember(member.userId!)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                            >
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                              <span className="flex-1 truncate text-left">
                                {member.user?.fullName ?? member.email}
                              </span>
                              {isSelected && <CheckIcon className="h-3.5 w-3.5 text-primary" />}
                            </button>
                          )
                        })
                      )}
                    </PopoverContent>
                  </Popover>
                </FormItem>
              </div>

              {/* Badges dos membros selecionados */}
              {distributionUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {distributionUserIds.map((userId) => {
                    const member = assignableMembers.find((m) => m.userId === userId)
                    return (
                      <Badge
                        key={userId}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleToggleMember(userId)}
                      >
                        {member?.user?.fullName ?? member?.email ?? userId}
                        <span className="ml-1 opacity-60">×</span>
                      </Badge>
                    )
                  })}
                </div>
              )}
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
            </div>

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
