'use client'

import { Dispatch, SetStateAction, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/_lib/utils'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { createDeal } from '@/_actions/deal/create-deal'
import { updateDeal } from '@/_actions/deal/update-deal'
import {
  dealFormSchema,
  type DealFormInput,
} from '@/_actions/deal/create-deal/schema'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface DealDialogContentProps {
  defaultValues?: Partial<DealFormInput> & { id?: string }
  stages: StageDto[]
  contacts: ContactDto[]
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export function DealDialogContent({
  defaultValues,
  stages,
  contacts,
  setIsOpen,
}: DealDialogContentProps) {
  const isEditing = !!defaultValues?.id
  const [open, setOpen] = useState(false)

  const form = useForm<DealFormInput>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      stageId: defaultValues?.stageId || stages[0]?.id || '',
      contactId: defaultValues?.contactId || undefined,
      companyId: defaultValues?.companyId || undefined,
      expectedCloseDate: defaultValues?.expectedCloseDate || undefined,
    },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createDeal,
    {
      onSuccess: () => {
        toast.success('Deal criado com sucesso!')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar deal.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateDeal,
    {
      onSuccess: () => {
        toast.success('Deal atualizado com sucesso!')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar deal.')
      },
    },
  )

  const onSubmit = (data: DealFormInput) => {
    if (isEditing && defaultValues?.id) {
      executeUpdate({
        id: defaultValues.id,
        title: data.title,
        contactId: data.contactId || null,
        companyId: data.companyId || null,
        expectedCloseDate: data.expectedCloseDate || undefined,
      })
    } else {
      executeCreate({
        title: data.title,
        stageId: data.stageId,
        contactId: data.contactId || undefined,
        companyId: data.companyId || undefined,
        expectedCloseDate: data.expectedCloseDate || undefined,
      })
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar Deal' : 'Novo Deal'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Atualize as informações do deal.'
            : 'Preencha os dados para criar um novo deal.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Proposta comercial Q1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditing && (
            <FormField
              control={form.control}
              name="stageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etapa *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a etapa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: stage.color || '#6b7280',
                              }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Contato</FormLabel>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                          'w-full justify-between font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        {field.value
                          ? contacts.find(
                              (contact) => contact.id === field.value,
                            )?.name
                          : 'Selecione um contato'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar contato..." />
                      <CommandList>
                        <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                        <CommandGroup>
                          {contacts.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={contact.name}
                              onSelect={() => {
                                form.setValue('contactId', contact.id)
                                setOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  contact.id === field.value
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              {contact.name}
                              {contact.companyName && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({contact.companyName})
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedCloseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Previsão de fechamento</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined,
                      )
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
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}
