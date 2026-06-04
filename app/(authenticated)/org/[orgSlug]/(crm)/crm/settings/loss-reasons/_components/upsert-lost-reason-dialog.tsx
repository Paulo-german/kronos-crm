'use client'

import { Dispatch, SetStateAction, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
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
import { Loader2 } from 'lucide-react'
import { createLostReason } from '@/_actions/settings/lost-reasons/create'
import { updateLostReason } from '@/_actions/settings/lost-reasons/update'
import { createLostReasonSchema } from '@/_actions/settings/lost-reasons/create/schema'
import * as z from 'zod'

// Schema unificado para o form (usando o de criação que tem validação de nome)
const upsertSchema = createLostReasonSchema

type UpsertInput = z.infer<typeof upsertSchema>

interface UpsertLostReasonDialogProps {
  defaultValues?: { id: string; name: string }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  isOpen: boolean
}

const UpsertLostReasonDialog = ({
  defaultValues,
  setIsOpen,
  isOpen,
}: UpsertLostReasonDialogProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<UpsertInput>({
    resolver: zodResolver(upsertSchema),
    defaultValues: {
      name: defaultValues?.name || '',
    },
  })

  // Reset do form quando abre/fecha ou mudam os valores default
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: defaultValues?.name || '',
      })
    }
  }, [isOpen, form, defaultValues])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createLostReason,
    {
      onSuccess: () => {
        toast.success('Motivo criado com sucesso!')
        setIsOpen(false)
        window.location.reload()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar motivo.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateLostReason,
    {
      onSuccess: () => {
        toast.success('Motivo atualizado com sucesso!')
        setIsOpen(false)
        window.location.reload()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar motivo.')
      },
    },
  )

  const onSubmit = (data: UpsertInput) => {
    if (isEditing && defaultValues?.id) {
      executeUpdate({ id: defaultValues.id, name: data.name })
    } else {
      executeCreate(data)
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <SheetContent className="overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Motivo' : 'Novo Motivo'}</SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize o nome do motivo de perda.'
            : 'Adicione um novo motivo de perda à lista.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Preço muito alto" {...field} />
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

export default UpsertLostReasonDialog
