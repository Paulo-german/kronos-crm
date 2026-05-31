'use client'

import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { z } from 'zod'
import { EntityType, FieldType } from '@prisma/client'
import { Loader2, Plus, X } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { createFieldDefinition } from '@/_actions/field-definition/create-field-definition'
import { updateFieldDefinition } from '@/_actions/field-definition/update-field-definition'
import { CUSTOM_FIELD_TYPES } from '@/_lib/custom-fields/types'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'
import {
  FIELD_DEFINITION_LABEL_MAX,
  FIELD_OPTION_LABEL_MAX,
  FIELD_OPTION_VALUE_MAX,
} from '@/_lib/constants/field-limits'

// Labels PT-BR para os tipos de campo
const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  SELECT: 'Seleção',
  DATE: 'Data',
  PHONE: 'Telefone',
  EMAIL: 'Email',
  URL: 'URL',
  CPF: 'CPF',
}

// Schema para o formulário de criação com options como array de objetos
const upsertFormSchema = z.object({
  label: z.string().trim().min(1, 'Nome do campo é obrigatório'),
  type: z.nativeEnum(FieldType),
  isRequired: z.boolean().default(false),
  options: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ).optional(),
})

type UpsertFormValues = z.input<typeof upsertFormSchema>

interface UpsertFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: EntityType
  defaultValues?: FieldDefinitionDto
}

export const UpsertFieldDialog = ({
  open,
  onOpenChange,
  entityType,
  defaultValues,
}: UpsertFieldDialogProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<UpsertFormValues>({
    resolver: zodResolver(upsertFormSchema),
    defaultValues: {
      label: '',
      type: FieldType.TEXT,
      isRequired: false,
      options: [],
    },
  })

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: 'options',
  })

  // Preenche o form ao abrir no modo de edição
  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        label: defaultValues.label,
        type: defaultValues.type,
        isRequired: defaultValues.isRequired,
        options: defaultValues.options ?? [],
      })
    }
    if (open && !defaultValues) {
      form.reset({
        label: '',
        type: FieldType.TEXT,
        isRequired: false,
        options: [],
      })
    }
  }, [open, defaultValues, form])

  const { execute: executeCreate, isPending: isCreating } = useAction(createFieldDefinition, {
    onSuccess: () => {
      toast.success('Campo criado com sucesso!')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar campo.')
    },
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(updateFieldDefinition, {
    onSuccess: () => {
      toast.success('Campo atualizado com sucesso!')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar campo.')
    },
  })

  const watchedType = form.watch('type')
  const isPending = isCreating || isUpdating

  const onSubmit = (data: UpsertFormValues) => {
    const validOptions = (data.options ?? []).filter(
      (option) => option.label.trim().length > 0 && option.value.trim().length > 0,
    )

    if (isEditing && defaultValues) {
      executeUpdate({
        id: defaultValues.id,
        label: data.label,
        isRequired: data.isRequired,
        options: data.type === FieldType.SELECT ? validOptions : undefined,
      })
      return
    }

    executeCreate({
      entityType,
      label: data.label,
      type: data.type,
      isRequired: data.isRequired,
      options: data.type === FieldType.SELECT ? validOptions : undefined,
    })
  }

  const handleAddOption = () => {
    const count = optionFields.length + 1
    appendOption({ label: `Opção ${count}`, value: `opcao_${count}` })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar campo' : 'Novo campo personalizado'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as configurações deste campo.'
              : 'Defina um campo adicional para enriquecer os registros.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do campo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Origem do Lead" maxLength={FIELD_DEFINITION_LABEL_MAX} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOM_FIELD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {FIELD_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      O tipo não pode ser alterado após a criação.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border px-4 py-3">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>Campo obrigatório</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Exige preenchimento ao salvar o contato.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Editor de opções — apenas para tipo SELECT */}
            {watchedType === FieldType.SELECT && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Opções de seleção</p>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">
                        Apenas o rótulo pode ser alterado. O valor interno é imutável para preservar
                        os dados já preenchidos.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Adicionar opção
                  </Button>
                </div>

                {optionFields.length === 0 && (
                  <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                    Nenhuma opção adicionada. Clique em &quot;Adicionar opção&quot; para começar.
                  </p>
                )}

                <div className="space-y-2">
                  {optionFields.map((optionField, index) => (
                    <div key={optionField.id} className="flex items-start gap-2">
                      <FormField
                        control={form.control}
                        name={`options.${index}.label`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="sr-only">
                              Rótulo da opção {index + 1}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Rótulo" maxLength={FIELD_OPTION_LABEL_MAX} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`options.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="sr-only">
                              Valor da opção {index + 1}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Valor interno"
                                maxLength={FIELD_OPTION_VALUE_MAX}
                                disabled={isEditing}
                                title={
                                  isEditing
                                    ? 'O valor interno não pode ser alterado após a criação para preservar os dados já preenchidos.'
                                    : undefined
                                }
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remover opção</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isEditing ? 'Atualizar' : 'Criar campo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
