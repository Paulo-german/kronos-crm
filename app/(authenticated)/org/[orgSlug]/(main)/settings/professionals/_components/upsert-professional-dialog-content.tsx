'use client'

import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { Label } from '@/_components/ui/label'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { Badge } from '@/_components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import { cn } from '@/_lib/utils'
import { createProfessional } from '@/_actions/professional/create-professional'
import { inviteProfessional } from '@/_actions/professional/invite-professional'
import {
  createProfessionalSchema,
  type CreateProfessionalInput,
} from '@/_actions/professional/create-professional/schema'
import type { UpdateProfessionalInput } from '@/_actions/professional/update-professional/schema'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'
import type { ServiceDto } from '@/_data-access/service/get-services'

// ---------------------------------------------------------------------------
// Constantes de jornada
// ---------------------------------------------------------------------------

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

const buildDefaultWorkingHours = () =>
  ALL_DAYS.map((day) => ({
    dayOfWeek: day,
    enabled: day >= 1 && day <= 5,
    startTime: '08:00',
    endTime: '18:00',
  }))

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UpsertProfessionalDialogContentProps {
  defaultValues?: ProfessionalDto
  setIsOpen: Dispatch<SetStateAction<boolean>>
  isOpen: boolean
  onUpdate?: (data: UpdateProfessionalInput) => void
  isUpdating?: boolean
  services?: ServiceDto[]
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const UpsertProfessionalDialogContent = ({
  defaultValues,
  setIsOpen,
  isOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
  services,
}: UpsertProfessionalDialogContentProps) => {
  const isEditing = !!defaultValues?.id

  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()

  const [servicePopoverOpen, setServicePopoverOpen] = useState(false)
  const [sendInvite, setSendInvite] = useState(false)

  const form = useForm<CreateProfessionalInput>({
    resolver: zodResolver(createProfessionalSchema),
    defaultValues: isEditing
      ? {
          name: defaultValues?.name ?? '',
          email: defaultValues?.email ?? '',
          bio: defaultValues?.bio ?? '',
        }
      : {
          name: '',
          email: '',
          bio: '',
          serviceIds: [],
          workingHours: buildDefaultWorkingHours(),
        },
  })

  // Reset do form quando o sheet abre — useEffect legítimo para sincronizar com estado externo
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        form.reset({
          name: defaultValues?.name ?? '',
          email: defaultValues?.email ?? '',
          bio: defaultValues?.bio ?? '',
        })
      } else {
        form.reset({
          name: '',
          email: '',
          bio: '',
          serviceIds: [],
          workingHours: buildDefaultWorkingHours(),
        })
        setSendInvite(false)
      }
    }
  }, [isOpen, form, defaultValues, isEditing])

  const { execute: executeInvite } = useAction(inviteProfessional, {
    onSuccess: () => toast.success('Convite enviado com sucesso!'),
    onError: ({ error }) =>
      toast.error(error.serverError ?? 'Erro ao enviar convite.'),
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createProfessional,
    {
      onSuccess: ({ data }) => {
        toast.success('Profissional criado com sucesso!')
        if (sendInvite && data?.professionalId) {
          executeInvite({
            professionalId: data.professionalId,
            email: form.getValues('email'),
          })
        }
        setIsOpen(false)
        if (data?.professionalId) {
          router.push(
            `/org/${params.orgSlug}/settings/professionals/${data.professionalId}`,
          )
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar profissional.')
      },
    },
  )

  const onSubmit = (data: CreateProfessionalInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({
        id: defaultValues.id,
        name: data.name,
        email: data.email ?? null,
        bio: data.bio ?? null,
      })
      return
    }
    executeCreate(data)
  }

  const isPending = isCreating || isUpdatingProp

  // Campo serviceIds monitorado apenas no modo criação
  const selectedServiceIds = !isEditing
    ? (form.watch('serviceIds') ?? [])
    : []

  const watchedEmail = form.watch('email')

  return (
    <SheetContent className="overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Profissional' : 'Novo Profissional'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações do profissional.'
            : 'Adicione um novo profissional à sua equipe.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          {/* Dados básicos */}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>E-mail *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="profissional@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição do profissional..."
                      className="resize-none"
                      maxLength={500}
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    {(field.value ?? '').length}/500 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Seleção de serviços — apenas no modo criação */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Serviços</Label>

              <Popover
                open={servicePopoverOpen}
                onOpenChange={setServicePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedServiceIds.length > 0
                      ? `${selectedServiceIds.length} serviço(s) selecionado(s)`
                      : 'Selecionar serviços'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar serviço..." />
                    <CommandList>
                      <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                      <CommandGroup>
                        {services?.map((service) => (
                          <CommandItem
                            key={service.id}
                            value={service.name}
                            onSelect={() => {
                              const current =
                                form.getValues('serviceIds') ?? []
                              const updated = current.includes(service.id)
                                ? current.filter(
                                    (existingId) => existingId !== service.id,
                                  )
                                : [...current, service.id]
                              form.setValue('serviceIds', updated, {
                                shouldDirty: true,
                              })
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedServiceIds.includes(service.id)
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            {service.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedServiceIds.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum serviço vinculado
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedServiceIds.map((serviceId) => {
                    const service = services?.find(
                      (found) => found.id === serviceId,
                    )
                    if (!service) return null
                    return (
                      <Badge
                        key={serviceId}
                        variant="secondary"
                        className="gap-1"
                      >
                        {service.name}
                        <button
                          type="button"
                          onClick={() => {
                            form.setValue(
                              'serviceIds',
                              selectedServiceIds.filter(
                                (sid) => sid !== serviceId,
                              ),
                              { shouldDirty: true },
                            )
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Jornada semanal — apenas no modo criação */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Jornada de trabalho</Label>
              <div className="rounded-md border border-border/50">
                {ALL_DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex items-center gap-3 border-b border-border/30 px-3 py-2 last:border-b-0"
                  >
                    <FormField
                      control={form.control}
                      name={`workingHours.${day}.enabled`}
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              aria-label={`Ativar ${DAY_LABELS[day]}`}
                              className="scale-[0.85]"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <span className="w-20 text-sm font-medium">
                      {DAY_LABELS[day]}
                    </span>

                    <FormField
                      control={form.control}
                      name={`workingHours.${day}.startTime`}
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input
                              type="time"
                              className="h-8 w-28"
                              {...field}
                              disabled={
                                !form.watch(`workingHours.${day}.enabled`)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <span className="text-xs text-muted-foreground">até</span>

                    <FormField
                      control={form.control}
                      name={`workingHours.${day}.endTime`}
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input
                              type="time"
                              className="h-8 w-28"
                              {...field}
                              disabled={
                                !form.watch(`workingHours.${day}.enabled`)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Switch de status — apenas na edição */}
          {isEditing && (
            <div className="border-t pt-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Profissional ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Profissionais ativos recebem agendamentos
                  </p>
                </div>
                <Switch
                  checked={defaultValues?.isActive ?? true}
                  onCheckedChange={(checked) => {
                    if (isEditing && defaultValues?.id) {
                      onUpdate?.({ id: defaultValues.id, isActive: checked })
                    }
                  }}
                  disabled={isUpdatingProp}
                />
              </div>
            </div>
          )}

          {/* Toggle de convite — apenas no modo criação */}
          {!isEditing && (
            <div className="border-t pt-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Convidar ao criar</Label>
                  <p className="text-sm text-muted-foreground">
                    {sendInvite && watchedEmail
                      ? `Convite será enviado para ${watchedEmail}`
                      : 'Enviar convite de acesso agora'}
                  </p>
                </div>
                <Switch
                  checked={sendInvite}
                  onCheckedChange={setSendInvite}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Salvando...
                </div>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </SheetContent>
  )
}

export default UpsertProfessionalDialogContent
