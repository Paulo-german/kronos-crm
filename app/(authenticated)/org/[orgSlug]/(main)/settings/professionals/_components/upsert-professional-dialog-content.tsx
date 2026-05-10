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
import { Label } from '@/_components/ui/label'
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
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { createProfessional } from '@/_actions/professional/create-professional'
import {
  createProfessionalSchema,
  type CreateProfessionalInput,
} from '@/_actions/professional/create-professional/schema'
import type { UpdateProfessionalInput } from '@/_actions/professional/update-professional/schema'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'

interface UpsertProfessionalDialogContentProps {
  defaultValues?: ProfessionalDto
  setIsOpen: Dispatch<SetStateAction<boolean>>
  isOpen: boolean
  onUpdate?: (data: UpdateProfessionalInput) => void
  isUpdating?: boolean
}

const UpsertProfessionalDialogContent = ({
  defaultValues,
  setIsOpen,
  isOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
}: UpsertProfessionalDialogContentProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateProfessionalInput>({
    resolver: zodResolver(createProfessionalSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      phone: defaultValues?.phone ?? '',
      bio: defaultValues?.bio ?? '',
      avatarUrl: defaultValues?.avatarUrl ?? '',
      userId: defaultValues?.userId ?? undefined,
    },
  })

  // Reset do form quando o sheet abre — useEffect legítimo para sincronizar com estado externo
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: defaultValues?.name ?? '',
        phone: defaultValues?.phone ?? '',
        bio: defaultValues?.bio ?? '',
        avatarUrl: defaultValues?.avatarUrl ?? '',
        userId: defaultValues?.userId ?? undefined,
      })
    }
  }, [isOpen, form, defaultValues])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createProfessional,
    {
      onSuccess: () => {
        toast.success('Profissional criado com sucesso!')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar profissional.')
      },
    },
  )

  const onSubmit = (data: CreateProfessionalInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({
        id: defaultValues.id,
        name: data.name,
        phone: data.phone ?? null,
        bio: data.bio ?? null,
        avatarUrl: data.avatarUrl ?? null,
      })
      return
    }
    executeCreate(data)
  }

  const isPending = isCreating || isUpdatingProp

  return (
    <SheetContent className="overflow-y-auto sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Profissional' : 'Novo Profissional'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações do profissional.'
            : 'Adicione um novo profissional à sua equipe.'}
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
                    <Input placeholder="Nome completo" {...field} />
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
                    <Input
                      placeholder="(11) 99999-0000"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Avatar</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição do profissional..."
                      className="resize-none"
                      maxLength={500}
                      rows={4}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    {(field.value ?? '').length}/500 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Switch de status — apenas na edição */}
          {isEditing && (
            <div className="border-t pt-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Profissional ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Profissionais ativos recebem agendamentos
                  </p>
                </div>
                <Switch
                  checked={defaultValues?.isActive ?? true}
                  onCheckedChange={(checked) => {
                    if (isEditing && defaultValues?.id) {
                      onUpdate?.({ id: defaultValues.id, isActive: checked })
                    }
                  }}
                  disabled={isUpdatingProp}
                />
              </div>
            </div>
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
  )
}

export default UpsertProfessionalDialogContent
