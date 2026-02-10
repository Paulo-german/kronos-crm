'use client'

import { Dispatch, SetStateAction, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
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
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import { createProduct } from '@/_actions/product/create-product'
import {
  productSchema,
  type ProductInput,
} from '@/_actions/product/create-product/schema'
import type { UpdateProductInput } from '@/_actions/product/update-product/schema'
import { Loader2 } from 'lucide-react'

interface UpsertProductDialogContentProps {
  defaultValues?: ProductInput & { id?: string }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  isOpen: boolean
  onUpdate?: (data: UpdateProductInput) => void
  isUpdating?: boolean
}

const UpsertProductDialogContent = ({
  defaultValues,
  setIsOpen,
  isOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
}: UpsertProductDialogContentProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues || {
      name: '',
      description: '',
      price: 0,
    },
  })

  useEffect(() => {
    if (isOpen) {
      form.reset(
        defaultValues || {
          name: '',
          description: '',
          price: 0,
        },
      )
    }
  }, [isOpen, form, defaultValues])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createProduct,
    {
      onSuccess: () => {
        toast.success('Produto criado com sucesso!')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar produto.')
      },
    },
  )

  const onSubmit = (data: ProductInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({ id: defaultValues.id, ...data })
    } else {
      executeCreate(data)
    }
  }

  const isPending = isCreating || isUpdatingProp

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'Editar Produto' : 'Novo Produto'}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Atualize as informações do produto.'
            : 'Adicione um novo produto ao catálogo.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do produto" {...field} />
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
                    placeholder="Descrição do produto"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
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
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
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
                  <Loader2 className="animate-spin" />
                  Salvar
                </div>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}

export default UpsertProductDialogContent
