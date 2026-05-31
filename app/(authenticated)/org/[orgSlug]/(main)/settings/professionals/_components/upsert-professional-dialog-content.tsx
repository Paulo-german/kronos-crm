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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { Badge } from '@/_components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'
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
import {
  createProfessionalSchema,
  type CreateProfessionalInput,
} from '@/_actions/professional/create-professional/schema'
import type { UpdateProfessionalInput } from '@/_actions/professional/update-professional/schema'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { MemberForProfessionalDto } from '@/_data-access/professional/get-accepted-members-without-professional'

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

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

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
  members?: MemberForProfessionalDto[]
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
  members,
}: UpsertProfessionalDialogContentProps) => {
  const isEditing = !!defaultValues?.id

  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()

  const [servicePopoverOpen, setServicePopoverOpen] = useState(false)
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false)
  const [mode, setMode] = useState<'new' | 'member'>('new')
  const [selectedMember, setSelectedMember] = useState<MemberForProfessionalDto | null>(null)

  const form = useForm<CreateProfessionalInput>({
    resolver: zodResolver(createProfessionalSchema),
    defaultValues: isEditing
      ? {
          name: defaultValues?.name ?? '',
          email: defaultValues?.email ?? '',
        }
      : {
          name: '',
          email: '',
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
        })
      } else {
        form.reset({
          name: '',
          email: '',
          serviceIds: [],
          workingHours: buildDefaultWorkingHours(),
        })
        setMode('new')
        setSelectedMember(null)
      }
    }
  }, [isOpen, form, defaultValues, isEditing])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createProfessional,
    {
      onSuccess: ({ data }) => {
        toast.success('Profissional criado com sucesso!')
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
        bio: null,
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

  const handleModeChange = (value: string) => {
    setMode(value as 'new' | 'member')
    setSelectedMember(null)
    form.setValue('userId', undefined)
    form.setValue('name', '')
    form.setValue('email', '')
  }

  const handleSelectMember = (member: MemberForProfessionalDto) => {
    form.setValue('name', member.name)
    form.setValue('email', member.email)
    form.setValue('userId', member.userId)
    setSelectedMember(member)
    setMemberPopoverOpen(false)
  }

  const sheetDescription = isEditing
    ? 'Atualize as informações do profissional.'
    : mode === 'new'
      ? 'Preencha os dados e enviaremos um convite por e-mail para o profissional acessar a agenda.'
      : 'Selecione um membro da equipe para adicioná-lo como profissional.'

  const submitLabel = isEditing || mode === 'member' ? 'Salvar' : 'Criar e Convidar'

  return (
    <SheetContent className="overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Profissional' : 'Novo Profissional'}
        </SheetTitle>
        <SheetDescription>{sheetDescription}</SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          {/* Seletor de modo — apenas no modo criação */}
          {!isEditing && (
            <Tabs value={mode} onValueChange={handleModeChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">
                  Nova pessoa
                </TabsTrigger>
                <TabsTrigger value="member">
                  Membro da equipe
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Seletor de membro — apenas em modo member e no modo criação */}
          {!isEditing && mode === 'member' && (
            <div className="space-y-2">
              <Label>Membro da equipe</Label>
              <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedMember ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={selectedMember.avatarUrl ?? undefined} alt={selectedMember.name} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(selectedMember.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedMember.name}</span>
                      </div>
                    ) : (
                      'Selecionar membro'
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar membro..." />
                    <CommandList>
                      <CommandEmpty>
                        {members && members.length === 0
                          ? 'Todos os membros já são profissionais.'
                          : 'Nenhum membro encontrado.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {members?.map((member) => (
                          <CommandItem
                            key={member.userId}
                            value={`${member.name} ${member.email}`}
                            onSelect={() => handleSelectMember(member)}
                          >
                            <Avatar className="mr-2 h-6 w-6">
                              <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{member.name}</span>
                              <span className="text-xs text-muted-foreground">{member.email}</span>
                            </div>
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                selectedMember?.userId === member.userId
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

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
                submitLabel
              )}
            </Button>
          </div>
        </form>
      </Form>
    </SheetContent>
  )
}

export default UpsertProfessionalDialogContent
