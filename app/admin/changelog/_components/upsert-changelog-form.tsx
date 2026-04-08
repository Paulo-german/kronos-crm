'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Switch } from '@/_components/ui/switch'
import { Separator } from '@/_components/ui/separator'

import { upsertChangelogEntry } from '@/_actions/changelog/upsert-changelog-entry'
import { upsertChangelogEntrySchema } from '@/_actions/changelog/upsert-changelog-entry/schema'
import type { ChangelogEntryAdminDto } from '@/_data-access/changelog/types'

// Usar z.input<> para garantir compatibilidade com campos que têm .default()
type FormValues = z.input<typeof upsertChangelogEntrySchema>

interface UpsertChangelogFormProps {
  defaultValues?: ChangelogEntryAdminDto
}

export const UpsertChangelogForm = ({ defaultValues }: UpsertChangelogFormProps) => {
  const router = useRouter()
  const isEditing = !!defaultValues?.id

  const form = useForm<FormValues>({
    resolver: zodResolver(upsertChangelogEntrySchema),
    defaultValues: {
      id: defaultValues?.id,
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      type: defaultValues?.type ?? undefined,
      isPublished: defaultValues?.isPublished ?? false,
    },
  })

  const { execute, status } = useAction(upsertChangelogEntry, {
    onSuccess: () => {
      toast.success(isEditing ? 'Entrada atualizada com sucesso.' : 'Entrada criada com sucesso.')
      router.push('/admin/changelog')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar entrada do changelog.')
    },
  })

  const isPending = status === 'executing'

  const handleSubmit = form.handleSubmit((values) => {
    execute(values)
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Novas integrações com WhatsApp Business"
                  {...field}
                />
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
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo da entrada" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="NEW">Novidade</SelectItem>
                  <SelectItem value="IMPROVEMENT">Melhoria</SelectItem>
                  <SelectItem value="FIX">Correção</SelectItem>
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
                  placeholder="Descreva as mudanças em markdown. Ex: ## O que há de novo&#10;&#10;- Suporte a mensagens de voz..."
                  className="min-h-[200px] resize-y font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Suporta Markdown: use ## para títulos, - para listas, **negrito** e *itálico*.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Publicar */}
        <FormField
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="space-y-0.5">
                <FormLabel>Publicar imediatamente</FormLabel>
                <FormDescription>
                  Ao publicar, a entrada ficará visível na página pública de changelog.
                </FormDescription>
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

        {/* Ações */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/changelog')}
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
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Salvar alterações' : 'Criar entrada'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
