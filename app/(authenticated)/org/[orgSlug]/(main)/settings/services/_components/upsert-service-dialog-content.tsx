'use client'

import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, Trash2, ChevronsUpDown } from 'lucide-react'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import { createService } from '@/_actions/service/create-service'
import { createServiceSchema } from '@/_actions/service/create-service/schema'
import { assignServiceToProfessional } from '@/_actions/professional-service/assign-service-to-professional'
import { removeServiceFromProfessional } from '@/_actions/professional-service/remove-service-from-professional'
import { z } from 'zod'
import type { UpdateServiceInput } from '@/_actions/service/update-service/schema'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'
import { CurrencyInput } from '@/_components/form-controls/currency-input'

// z.input<> captura o tipo antes do .default() do Zod — necessário para zodResolver
type ServiceFormValues = z.input<typeof createServiceSchema>

// Formata duração em minutos para label legível
const formatDurationPreview = (minutes: number): string => {
  if (!minutes || minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) return `${remainingMinutes} min`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

interface UpsertServiceDialogContentProps {
  categories: ServiceCategoryDto[]
  professionals?: ProfessionalDto[]
  defaultValues?: ServiceDto
  setIsOpen: Dispatch<SetStateAction<boolean>>
  isOpen: boolean
  onUpdate?: (data: UpdateServiceInput) => void
  isUpdating?: boolean
}

const UpsertServiceDialogContent = ({
  categories,
  professionals = [],
  defaultValues,
  setIsOpen,
  isOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
}: UpsertServiceDialogContentProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      categoryId: defaultValues?.categoryId ?? '',
      duration: defaultValues?.duration ?? undefined,
      price: defaultValues?.price ? parseFloat(defaultValues.price) : undefined,
      isActive: defaultValues?.isActive ?? true,
    },
  })

  // Estado local dos profissionais vinculados — gerenciado otimisticamente
  const [assignedProfessionals, setAssignedProfessionals] = useState<
    ServiceDto['professionalServices']
  >(() => defaultValues?.professionalServices ?? [])

  const [comboboxOpen, setComboboxOpen] = useState(false)

  const [removeConfirm, setRemoveConfirm] = useState<{
    isOpen: boolean
    professionalId: string
    professionalName: string
  }>({ isOpen: false, professionalId: '', professionalName: '' })

  // Reset do form e estado de profissionais quando o sheet abre
  // useEffect legítimo para sincronizar com estado externo (abertura do sheet)
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: defaultValues?.name ?? '',
        categoryId: defaultValues?.categoryId ?? '',
        duration: defaultValues?.duration ?? undefined,
        price: defaultValues?.price
          ? parseFloat(defaultValues.price)
          : undefined,
        isActive: defaultValues?.isActive ?? true,
      })
      setAssignedProfessionals(defaultValues?.professionalServices ?? [])
    }
  }, [isOpen, form, defaultValues])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createService,
    {
      onSuccess: () => {
        toast.success('Serviço criado com sucesso!')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar serviço.')
      },
    },
  )

  const { execute: executeAssign, isPending: isAssigning } = useAction(
    assignServiceToProfessional,
    {
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao vincular profissional.')
        // Reverte o estado otimista em caso de erro
        setAssignedProfessionals(defaultValues?.professionalServices ?? [])
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeServiceFromProfessional,
    {
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover profissional.')
        // Reverte o estado otimista em caso de erro
        setAssignedProfessionals(defaultValues?.professionalServices ?? [])
      },
    },
  )

  const handleAssign = (professionalId: string) => {
    if (!defaultValues?.id) return

    const foundProfessional = professionals.find((prof) => prof.id === professionalId)
    if (!foundProfessional) return

    // Atualização otimista
    setAssignedProfessionals((prev) => [
      ...prev,
      {
        id: `optimistic-${professionalId}`,
        professionalId,
        professional: {
          id: foundProfessional.id,
          name: foundProfessional.name,
          avatarUrl: foundProfessional.avatarUrl,
          isActive: foundProfessional.isActive,
        },
      },
    ])
    setComboboxOpen(false)

    executeAssign({ professionalId, serviceId: defaultValues.id })
  }

  const handleRemoveConfirmed = () => {
    if (!defaultValues?.id || !removeConfirm.professionalId) return

    // Atualização otimista
    setAssignedProfessionals((prev) =>
      prev.filter(
        (ap) => ap.professionalId !== removeConfirm.professionalId,
      ),
    )

    executeRemove({
      professionalId: removeConfirm.professionalId,
      serviceId: defaultValues.id,
    })
    setRemoveConfirm({ isOpen: false, professionalId: '', professionalName: '' })
  }

  const availableProfessionals = professionals.filter(
    (professional) =>
      professional.isActive &&
      !assignedProfessionals.some(
        (ap) => ap.professionalId === professional.id,
      ),
  )

  const onSubmit = (data: ServiceFormValues) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({
        id: defaultValues.id,
        name: data.name,
        categoryId: data.categoryId,
        duration: data.duration,
        price: data.price,
        isActive: data.isActive ?? true,
      })
      return
    }
    // Garante o campo com default antes de enviar para a action
    executeCreate({ ...data, isActive: data.isActive ?? true })
  }

  const isPending = isCreating || isUpdatingProp
  const watchedDuration = form.watch('duration')

  return (
    <>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Atualize as informações do serviço.'
              : 'Adicione um novo serviço ao catálogo.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do serviço" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Categoria *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={720}
                        placeholder="60"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value
                              ? parseInt(event.target.value, 10)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    {watchedDuration && watchedDuration > 0 && (
                      <FormDescription>
                        {formatDurationPreview(watchedDuration)}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$) *</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder="R$ 0,00"
                        value={field.value ?? ''}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue ?? undefined)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Serviço ativo</FormLabel>
                      <FormDescription>
                        Serviços ativos ficam disponíveis para agendamento
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {isEditing && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Profissionais</p>
                      <p className="text-xs text-muted-foreground">
                        Profissionais habilitados a executar este serviço
                      </p>
                    </div>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            availableProfessionals.length === 0 || isAssigning
                          }
                        >
                          {isAssigning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ChevronsUpDown className="mr-2 h-4 w-4" />
                          )}
                          Adicionar
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Buscar profissional..." />
                          <CommandList>
                            <CommandEmpty>
                              Nenhum profissional disponível.
                            </CommandEmpty>
                            <CommandGroup>
                              {availableProfessionals.map((professional) => (
                                <CommandItem
                                  key={professional.id}
                                  value={professional.name}
                                  onSelect={() => handleAssign(professional.id)}
                                >
                                  {professional.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {assignedProfessionals.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/50 py-6 text-center">
                      <p className="text-xs text-muted-foreground">
                        Nenhum profissional vinculado
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignedProfessionals.map(
                        ({ id, professionalId, professional }) => (
                          <div
                            key={id}
                            className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={professional.avatarUrl ?? undefined}
                                  alt={professional.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(professional.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {professional.name}
                              </span>
                              {!professional.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Inativo
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              disabled={isRemoving}
                              onClick={() =>
                                setRemoveConfirm({
                                  isOpen: true,
                                  professionalId,
                                  professionalName: professional.name,
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">
                                Remover {professional.name}
                              </span>
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </>
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

      <AlertDialog
        open={removeConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveConfirm({
              isOpen: false,
              professionalId: '',
              professionalName: '',
            })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              O profissional{' '}
              <span className="font-semibold text-foreground">
                {removeConfirm.professionalName}
              </span>{' '}
              não poderá mais executar este serviço.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveConfirmed}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default UpsertServiceDialogContent
