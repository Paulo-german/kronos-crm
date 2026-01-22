'use client'

import { Dispatch, SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import type { NumberFormatValues } from 'react-number-format'
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
import { Switch } from '@/_components/ui/switch'
import { createContact } from '@/_actions/contact/create-contact'
import { updateContact } from '@/_actions/contact/update-contact'
import {
  contactSchema,
  type ContactInput,
} from '@/_actions/contact/create-contact/schema'
import { CompanyCombobox } from './company-combobox'
import { PhoneInput } from '@/_components/ui/phone-input'

interface UpsertContactDialogContentProps {
  defaultValues?: ContactInput & { id?: string }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  companyOptions?: { id: string; name: string }[]
}

const UpsertContactDialogContent = ({
  defaultValues,
  setIsOpen,
  companyOptions = [],
}: UpsertContactDialogContentProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaultValues || {
      name: '',
      email: '',
      phone: '',
      role: '',
      cpf: '',
      companyId: undefined, // null vs undefined fix
      isDecisionMaker: false,
    },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createContact,
    {
      onSuccess: () => {
        toast.success('Contato criado com sucesso!')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar contato.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateContact,
    {
      onSuccess: () => {
        toast.success('Contato atualizado com sucesso!')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar contato.')
      },
    },
  )

  const onSubmit = (data: ContactInput) => {
    if (isEditing && defaultValues?.id) {
      executeUpdate({ id: defaultValues.id, ...data })
    } else {
      executeCreate(data)
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'Editar Contato' : 'Novo Contato'}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Atualize as informações do contato abaixo.'
            : 'Preencha os dados para adicionar um novo contato.'}
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
                  <Input placeholder="Nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <PhoneInput
                      placeholder="(11) 99999-9999"
                      value={field.value || ''}
                      onValueChange={(values: NumberFormatValues) =>
                        field.onChange(values.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl>
                    <CompanyCombobox
                      value={field.value || undefined}
                      onChange={field.onChange}
                      options={companyOptions}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Diretor"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000.000.000-00"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDecisionMaker"
              render={({ field }) => (
                <FormItem className="mt-8 flex flex-row items-center space-x-3 space-y-0 rounded-md border px-4">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="leading-none">
                    <FormLabel>Tomador de decisão</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}

export default UpsertContactDialogContent
