'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { createLabel } from '@/_actions/conversation-label/create-label'
import { updateLabel } from '@/_actions/conversation-label/update-label'
import { createLabelSchema } from '@/_actions/conversation-label/create-label/schema'
import { LABEL_COLORS } from '@/_lib/constants/label-colors'
import { cn } from '@/_lib/utils'

const upsertLabelSchema = createLabelSchema

type UpsertLabelInput = z.infer<typeof upsertLabelSchema>

interface LabelDefaultValues {
  id: string
  name: string
  color: string
}

interface UpsertLabelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: LabelDefaultValues
}

const UpsertLabelDialog = ({
  open,
  onOpenChange,
  defaultValues,
}: UpsertLabelDialogProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<UpsertLabelInput>({
    resolver: zodResolver(upsertLabelSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      color: (defaultValues?.color as UpsertLabelInput['color']) ?? 'blue',
    },
  })

  // Reseta o form ao abrir ou ao mudar os valores default
  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name ?? '',
        color: (defaultValues?.color as UpsertLabelInput['color']) ?? 'blue',
      })
    }
  }, [open, defaultValues, form])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createLabel,
    {
      onSuccess: () => {
        toast.success('Etiqueta criada com sucesso!')
        onOpenChange(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar etiqueta.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateLabel,
    {
      onSuccess: () => {
        toast.success('Etiqueta atualizada com sucesso!')
        onOpenChange(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar etiqueta.')
      },
    },
  )

  const onSubmit = (data: UpsertLabelInput) => {
    if (isEditing && defaultValues?.id) {
      executeUpdate({ id: defaultValues.id, name: data.name, color: data.color })
      return
    }
    executeCreate(data)
  }

  const isPending = isCreating || isUpdating
  const selectedColor = form.watch('color')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Etiqueta' : 'Nova Etiqueta'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize o nome ou a cor da etiqueta.'
              : 'Crie uma etiqueta para organizar suas conversas.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Urgente, Suporte, VIP..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor *</FormLabel>
                  <FormControl>
                    {/* Grid 5 colunas de círculos coloridos */}
                    <div className="grid grid-cols-5 gap-2">
                      {LABEL_COLORS.map((colorOption) => (
                        <button
                          key={colorOption.key}
                          type="button"
                          title={colorOption.label}
                          onClick={() => field.onChange(colorOption.key)}
                          className={cn(
                            'h-8 w-8 rounded-full transition-transform hover:scale-110 focus:outline-none',
                            colorOption.dot,
                            selectedColor === colorOption.key &&
                              'ring-2 ring-primary ring-offset-2',
                          )}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default UpsertLabelDialog
