'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FieldType } from '@prisma/client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { InlineTextField } from '@/_components/form-controls/inline-text-field'
import { parseFieldValue } from '@/_lib/custom-fields/serialize'
import { formatCpf } from '@/_lib/utils'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'

interface CustomFieldInlineEditorProps {
  definition: FieldDefinitionDto
  rawValue: string | null
  /** Persiste o novo valor (já normalizado: string vazia vira null). Agnóstico de entidade. */
  onSave: (value: string | null) => void
  isPending?: boolean
}

function formatDisplayValue(
  definition: FieldDefinitionDto,
  rawValue: string | null,
): string | null {
  if (!rawValue) return null

  switch (definition.type) {
    case FieldType.SELECT:
      return (
        definition.options?.find((option) => option.value === rawValue)
          ?.label ?? rawValue
      )

    case FieldType.CPF:
      return formatCpf(rawValue)

    case FieldType.DATE: {
      const date = new Date(rawValue)
      if (Number.isNaN(date.getTime())) return rawValue
      return format(date, 'dd/MM/yyyy', { locale: ptBR })
    }

    default:
      return rawValue
  }
}

function resolveInputType(type: FieldType): React.HTMLInputTypeAttribute {
  switch (type) {
    case FieldType.NUMBER:
      return 'number'
    case FieldType.DATE:
      return 'date'
    case FieldType.EMAIL:
      return 'email'
    case FieldType.URL:
      return 'url'
    case FieldType.PHONE:
      return 'tel'
    default:
      return 'text'
  }
}

/**
 * Editor inline de um campo personalizado, agnóstico de entidade.
 * A persistência é injetada via `onSave` — cada entidade (contato, negociação)
 * fornece sua própria server action.
 */
export function CustomFieldInlineEditor({
  definition,
  rawValue,
  onSave,
  isPending,
}: CustomFieldInlineEditorProps) {
  const handleSave = (value: string) => {
    onSave(value || null)
  }

  if (definition.type === FieldType.SELECT) {
    return (
      <Select
        value={rawValue ?? ''}
        onValueChange={handleSave}
        disabled={isPending}
      >
        <SelectTrigger className="h-7 w-auto min-w-[120px] border-0 bg-transparent px-0 text-sm font-medium shadow-none hover:bg-accent focus:ring-0">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {definition.options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <InlineTextField
      value={parseFieldValue(definition.type, rawValue)}
      displayValue={formatDisplayValue(definition, rawValue)}
      onSave={handleSave}
      isPending={isPending}
      placeholder="Adicionar"
      inputType={resolveInputType(definition.type)}
      displayClassName="font-medium"
      inputClassName="h-7 w-[180px]"
    />
  )
}
