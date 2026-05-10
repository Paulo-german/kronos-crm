'use client'

import { Dispatch, SetStateAction, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { createService } from '@/_actions/service/create-service'
import {
  createServiceSchema,
} from '@/_actions/service/create-service/schema'
import { z } from 'zod'
import type { UpdateServiceInput } from '@/_actions/service/update-service/schema'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'
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

interface UpsertServiceDialogContentProps {
  categories: ServiceCategoryDto[]
  defaultValues?: ServiceDto
  setIsOpen: Dispatch<SetStateAction<boolean>>
  isOpen: boolean
  onUpdate?: (data: UpdateServiceInput) => void
  isUpdating?: boolean
}

const UpsertServiceDialogContent = ({
  categories,
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

  // Reset do form quando o sheet abre — useEffect legítimo para sincronizar com estado externo
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

export default UpsertServiceDialogContent
