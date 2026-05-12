'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, PlusCircle, X } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Button } from '@/_components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/_components/ui/sheet'
import { Switch } from '@/_components/ui/switch'
import { Textarea } from '@/_components/ui/textarea'

import { createPromotion } from '@/_actions/promotion/create-promotion'
import {
  createPromotionSchema,
  type CreatePromotionInput,
} from '@/_actions/promotion/create-promotion/schema'
import type { UpdatePromotionInput } from '@/_actions/promotion/update-promotion/schema'
import { formatCurrency } from '@/_utils/format-currency'
import type { PromotionDto } from '@/_data-access/promotion/get-promotions'
import type { ProductDto } from '@/_data-access/product/get-products'
import type { ServiceDto } from '@/_data-access/service/get-services'

export interface UpsertPromotionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: PromotionDto
  onUpdate: (data: UpdatePromotionInput) => void
  isUpdating: boolean
  products: ProductDto[]
  services: ServiceDto[]
}

export function UpsertPromotionSheet({
  open,
  onOpenChange,
  defaultValues,
  onUpdate,
  isUpdating,
  products,
  services,
}: UpsertPromotionSheetProps) {
  const isEditing = !!defaultValues?.id

  const [catalogType, setCatalogType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT')
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState<number>(0)

  const form = useForm<CreatePromotionInput>({
    resolver: zodResolver(createPromotionSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      price: defaultValues?.price ?? undefined,
      isActive: defaultValues?.isActive ?? true,
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const watchedItems = useWatch({ control: form.control, name: 'items' })

  useEffect(() => {
    if (!open) return

    const hasServices = defaultValues?.items?.some((item) => item.serviceId)
    setCatalogType(hasServices ? 'SERVICE' : 'PRODUCT')
    setDiscountType((defaultValues?.discountType as 'PERCENTAGE' | 'FIXED') ?? 'PERCENTAGE')
    setDiscountValue(defaultValues?.discountValue ?? 0)

    form.reset({
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      price: defaultValues?.price ?? undefined,
      isActive: defaultValues?.isActive ?? true,
      items: (defaultValues?.items ?? []).map((item) => ({
        productId: item.productId ?? undefined,
        serviceId: item.serviceId ?? undefined,
        quantity: item.quantity,
      })),
    })
  }, [open, defaultValues, form])

  const subtotal = useMemo(() => {
    if (!watchedItems) return 0
    return watchedItems.reduce((acc, item) => {
      const qty = item?.quantity || 1
      if (catalogType === 'PRODUCT') {
        const product = products.find((p) => p.id === item?.productId)
        return acc + (product ? product.price * qty : 0)
      }
      const service = services.find((s) => s.id === item?.serviceId)
      return acc + (service ? parseFloat(service.price) * qty : 0)
    }, 0)
  }, [watchedItems, catalogType, products, services])

  const discountAmount = useMemo(() => {
    if (discountType === 'PERCENTAGE') return subtotal * (discountValue / 100)
    return discountValue
  }, [discountType, discountValue, subtotal])

  const finalPrice = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount])

  useEffect(() => {
    form.setValue('price', finalPrice)
  }, [finalPrice, form])

  const handleCatalogTypeChange = (type: 'PRODUCT' | 'SERVICE') => {
    setCatalogType(type)
    form.setValue('items', [])
  }

  const catalog = catalogType === 'PRODUCT' ? products : services

  const { execute: executeCreate, isPending: isCreating } = useAction(createPromotion, {
    onSuccess: () => {
      toast.success('Promoção criada com sucesso!')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar promoção.')
    },
  })

  const onSubmit = (data: CreatePromotionInput) => {
    const payload = { ...data, discountType, discountValue }
    if (isEditing && defaultValues?.id) {
      onUpdate({ id: defaultValues.id, ...payload })
    } else {
      executeCreate(payload)
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <SheetContent className="overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Promoção' : 'Nova Promoção'}</SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações da promoção.'
            : 'Adicione uma nova promoção ao catálogo.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da promoção" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descrição da promoção"
                    className="resize-none"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo do catálogo — define se os itens são produtos ou serviços */}
          <div className="space-y-2">
            <p className="text-sm font-medium leading-none">Tipo de catálogo</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={catalogType === 'PRODUCT' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => handleCatalogTypeChange('PRODUCT')}
              >
                Produtos
              </Button>
              <Button
                type="button"
                variant={catalogType === 'SERVICE' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => handleCatalogTypeChange('SERVICE')}
              >
                Serviços
              </Button>
            </div>
          </div>

          {/* Itens da promoção */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none">
                {catalogType === 'PRODUCT' ? 'Produtos incluídos' : 'Serviços incluídos'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: undefined, serviceId: undefined, quantity: 1 })}
                disabled={catalog.length === 0}
              >
                <PlusCircle className="mr-1 h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {catalog.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum {catalogType === 'PRODUCT' ? 'produto' : 'serviço'} cadastrado no catálogo.
              </p>
            )}

            {fields.length === 0 && catalog.length > 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
            )}

            {fields.map((field, index) => {
              const currentItem = watchedItems?.[index]
              const selectedId =
                catalogType === 'PRODUCT'
                  ? (currentItem?.productId ?? '')
                  : (currentItem?.serviceId ?? '')

              return (
                <div key={field.id} className="flex gap-2 items-center">
                  <Select
                    value={selectedId}
                    onValueChange={(id) => {
                      if (catalogType === 'PRODUCT') {
                        form.setValue(`items.${index}.productId`, id)
                        form.setValue(`items.${index}.serviceId`, undefined)
                      } else {
                        form.setValue(`items.${index}.serviceId`, id)
                        form.setValue(`items.${index}.productId`, undefined)
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={
                          catalogType === 'PRODUCT' ? 'Selecione um produto' : 'Selecione um serviço'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min={1}
                    className="w-20 shrink-0"
                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => remove(index)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remover item</span>
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Calculadora de preço */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium leading-none">Calculadora de preço</p>

            {watchedItems && watchedItems.length > 0 && (
              <div className="space-y-1">
                {watchedItems.map((item, index) => {
                  const qty = item?.quantity || 1
                  let name = ''
                  let unitPrice = 0

                  if (catalogType === 'PRODUCT') {
                    const product = products.find((p) => p.id === item?.productId)
                    name = product?.name ?? ''
                    unitPrice = product?.price ?? 0
                  } else {
                    const service = services.find((s) => s.id === item?.serviceId)
                    name = service?.name ?? ''
                    unitPrice = service ? parseFloat(service.price) : 0
                  }

                  if (!name) return null

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span className="truncate max-w-[160px]">{name}</span>
                      <span className="shrink-0 ml-2 tabular-nums">
                        {qty > 1 ? `${qty}x ` : ''}
                        {formatCurrency(unitPrice)}
                        {qty > 1 && (
                          <span className="text-foreground font-medium">
                            {' '}= {formatCurrency(unitPrice * qty)}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Desconto</span>
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  type="button"
                  variant={discountType === 'PERCENTAGE' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setDiscountType('PERCENTAGE'); setDiscountValue(0) }}
                >
                  %
                </Button>
                <Button
                  type="button"
                  variant={discountType === 'FIXED' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setDiscountType('FIXED'); setDiscountValue(0) }}
                >
                  R$
                </Button>
                <Input
                  type="number"
                  min={0}
                  max={discountType === 'PERCENTAGE' ? 100 : undefined}
                  step={discountType === 'PERCENTAGE' ? 1 : 0.01}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-sm"
                  placeholder={discountType === 'PERCENTAGE' ? '0' : '0,00'}
                />
              </div>
            </div>

            <div className="border-t border-border/50" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Preço final</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(finalPrice)}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Promoção ativa</FormLabel>
                    <FormDescription>
                      Promoções ativas ficam disponíveis para o agente IA
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvar
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
