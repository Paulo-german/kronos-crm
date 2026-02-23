'use client'

import { Dispatch, SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import type { NumberFormatValues } from 'react-number-format'
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
import { Switch } from '@/_components/ui/switch'
import { createContact } from '@/_actions/contact/create-contact'
import {
  contactSchema,
  type ContactInput,
} from '@/_actions/contact/create-contact/schema'
import type { UpdateContactInput } from '@/_actions/contact/update-contact/schema'
import { CompanyCombobox } from './company-combobox'
import { PhoneInput } from '@/_components/form-controls/phone-input'
import { Loader2 } from 'lucide-react'

interface UpsertContactDialogContentProps {
  defaultValues?: ContactInput & { id?: string }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  companyOptions?: { id: string; name: string }[]
  onUpdate?: (data: UpdateContactInput) => void
  isUpdating?: boolean
}

const UpsertContactDialogContent = ({
  defaultValues,
  setIsOpen,
  companyOptions = [],
  onUpdate,
  isUpdating: isUpdatingProp = false,
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
      onSuccess: ({ data }) => {
        toast.success('Contato criado com sucesso!')
        if (data?.current && data?.limit && data.limit > 0) {
          const pct = data.current / data.limit
          if (pct >= 0.9) {
            toast.warning(
              `Voce esta usando ${data.current} de ${data.limit} contatos. Considere fazer upgrade.`,
              { duration: 6000 },
            )
          }
        }
        form.reset()
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar contato.')
      },
    },
  )

  const onSubmit = (data: ContactInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({ id: defaultValues.id, ...data })
    } else {
      executeCreate(data)
    }
  }

  const handleCloseDialog = () => {
    form.reset()
    setIsOpen(false)
  }

  const isPending = isCreating || isUpdatingProp

  return (
    <SheetContent className="overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Contato' : 'Novo Contato'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações do contato abaixo.'
            : 'Preencha os dados para adicionar um novo contato.'}
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
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
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
    </SheetContent>
  )
}

export default UpsertContactDialogContent
