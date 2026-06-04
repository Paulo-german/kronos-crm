'use client'

import { useRouter } from 'next/navigation'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Switch } from '@/_components/ui/switch'
import { createSquad } from '@/_actions/squad/create-squad'
import { createSquadSchema } from '@/_actions/squad/create-squad/schema'
import type { CreateSquadInput } from '@/_actions/squad/create-squad/schema'
import type { UpdateSquadInput } from '@/_actions/squad/update-squad/schema'
import type { SquadDto } from '@/_data-access/squad/get-squads'

interface UpsertSquadSheetContentProps {
  orgSlug: string
  defaultValues?: SquadDto
  setIsOpen: (open: boolean) => void
  onUpdate?: (data: UpdateSquadInput) => void
  isUpdating?: boolean
}

const SQUAD_TYPE_LABELS: Record<string, string> = {
  SALES: 'Vendas',
  SUPPORT: 'Suporte',
  CS: 'Customer Success',
  GENERAL: 'Geral',
}

export function UpsertSquadSheetContent({
  orgSlug,
  defaultValues,
  setIsOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
}: UpsertSquadSheetContentProps) {
  const router = useRouter()
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateSquadInput>({
    resolver: zodResolver(createSquadSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? null,
      type: defaultValues?.type ?? 'SALES',
      isDefault: defaultValues?.isDefault ?? false,
    },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createSquad,
    {
      onSuccess: ({ data }) => {
        toast.success('Time criado com sucesso!')
        form.reset()
        setIsOpen(false)
        if (data?.squadId) {
          router.push(`/org/${orgSlug}/settings/members/squads/${data.squadId}`)
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar time.')
      },
    },
  )

  const onSubmit = (data: CreateSquadInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({ id: defaultValues.id, ...data })
      return
    }
    executeCreate(data)
  }

  const isPending = isCreating || isUpdatingProp

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Time' : 'Novo Time'}</SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações do time.'
            : 'Crie um novo time para organizar sua equipe.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 space-y-5"
        >
          {/* Nome */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do time</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Time de Vendas Brasil" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(SQUAD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Descrição */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descrição opcional do time..."
                    className="resize-none"
                    rows={3}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Time Padrão */}
          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Time padrão</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Novos leads serão atribuídos a este time automaticamente.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar alterações' : 'Criar time'}
            </Button>
          </div>
        </form>
      </Form>
    </SheetContent>
  )
}
