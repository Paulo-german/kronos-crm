'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  DialogContent,
  DialogDescription,
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
import { Label } from '@/_components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import { CurrencyInput } from '@/_components/form-controls/currency-input'
import type { NumberFormatValues } from 'react-number-format'
import type { ProductDto } from '@/_data-access/product/get-products'
import { formatCurrency } from '@/_utils/format-currency'

const productFormSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto'),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1'),
  unitPrice: z.number().min(0, 'Preço não pode ser negativo'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0, 'Desconto não pode ser negativo'),
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface UpsertProductDialogProps {
  isOpen: boolean
  defaultValues?: ProductFormValues & { id?: string }
  products: ProductDto[]
  onSubmit: (data: ProductFormValues & { id?: string }) => void
  onCancel: () => void
  isPending: boolean
}

const UpsertProductDialog = ({
  isOpen,
  defaultValues,
  products,
  onSubmit,
  onCancel,
  isPending,
}: UpsertProductDialogProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultValues || {
      productId: '',
      quantity: 1,
      unitPrice: 0,
      discountType: 'percentage',
      discountValue: 0,
    },
  })

  // Handler para fechar e resetar
  const handleClose = () => {
    form.reset()
    onCancel()
  }

  // Atualizar preço quando seleciona produto (apenas na criação)
  const handleProductSelect = (productId: string) => {
    if (!isEditing) {
      const product = products.find((p) => p.id === productId)
      if (product) {
        form.setValue('unitPrice', product.price)
      }
    }
  }

  const handleFormSubmit = (data: ProductFormValues) => {
    onSubmit(
      isEditing && defaultValues?.id ? { ...data, id: defaultValues.id } : data,
    )
  }

  // Valores para cálculo do resumo
  const watchedValues = form.watch()
  const { quantity, unitPrice, discountType, discountValue } = watchedValues

  const grossSubtotal = quantity * unitPrice
  const discountAmount =
    discountType === 'percentage'
      ? (grossSubtotal * discountValue) / 100
      : discountValue
  const netSubtotal = grossSubtotal - discountAmount

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'Editar Produto' : 'Adicionar Produto'}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Atualize a quantidade, preço ou desconto do produto.'
            : 'Selecione um produto e defina quantidade, preço e desconto.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-4 py-4"
        >
          {/* Produto */}
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Produto *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    handleProductSelect(value)
                  }}
                  disabled={isEditing}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantidade e Preço */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 1)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço Unitário</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      placeholder="R$ 0,00"
                      value={field.value}
                      onValueChange={(values: NumberFormatValues) => {
                        field.onChange(values.floatValue || 0)
                      }}
                      allowNegative={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Sistema de Descontos */}
          <div className="space-y-3">
            <Label>Desconto</Label>

            {/* Seletor de Tipo */}
            <FormField
              control={form.control}
              name="discountType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={(v) =>
                        field.onChange(v as 'percentage' | 'fixed')
                      }
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="percentage">
                          % Porcentagem
                        </TabsTrigger>
                        <TabsTrigger value="fixed">R$ Fixo</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Input Condicional */}
            <FormField
              control={form.control}
              name="discountValue"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    {discountType === 'percentage' ? (
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    ) : (
                      <CurrencyInput
                        placeholder="R$ 0,00"
                        value={field.value}
                        onValueChange={(values: NumberFormatValues) => {
                          field.onChange(values.floatValue || 0)
                        }}
                        allowNegative={false}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Card de Resumo em Tempo Real */}
          {quantity > 0 && unitPrice > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="space-y-2 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal Bruto:</span>
                  <span className="font-medium">
                    {formatCurrency(grossSubtotal)}
                  </span>
                </div>

                {discountValue > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Desconto Aplicado:</span>
                    <span className="font-medium">
                      - {formatCurrency(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="my-2 border-t border-border" />

                <div className="flex justify-between text-base font-bold">
                  <span>Total Líquido:</span>
                  <span className="text-[#00b37e]">
                    {formatCurrency(netSubtotal)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}

export default UpsertProductDialog
