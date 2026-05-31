'use client'

import type { Control, FieldValues, Path } from 'react-hook-form'
import { FieldType } from '@prisma/client'
import {
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
import { PhoneInput } from '@/_components/form-controls/phone-input'
import { CpfInput } from '@/_components/form-controls/cpf-input'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'
import { CUSTOM_FIELD_VALUE_MAX } from '@/_lib/constants/field-limits'

interface CustomFieldInputProps<TFieldValues extends FieldValues> {
  definition: FieldDefinitionDto
  control: Control<TFieldValues>
  name: Path<TFieldValues>
}

export const CustomFieldInput = <TFieldValues extends FieldValues>({
  definition,
  control,
  name,
}: CustomFieldInputProps<TFieldValues>) => {
  const labelText = definition.isRequired
    ? `${definition.label} *`
    : definition.label

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{labelText}</FormLabel>
          <FormControl>
            {renderInput(definition, field)}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function renderInput(
  definition: FieldDefinitionDto,
  field: {
    value: string | undefined
    onChange: (value: string) => void
    onBlur: () => void
    name: string
    ref: React.Ref<unknown>
  },
) {
  const value = field.value ?? ''

  switch (definition.type) {
    case FieldType.TEXT:
      return (
        <Input
          placeholder={definition.label}
          maxLength={CUSTOM_FIELD_VALUE_MAX[FieldType.TEXT]}
          value={value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          ref={field.ref as React.Ref<HTMLInputElement>}
        />
      )

    case FieldType.NUMBER:
      return (
        <Input
          type="number"
          placeholder="0"
          value={value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          ref={field.ref as React.Ref<HTMLInputElement>}
        />
      )

    case FieldType.EMAIL:
      return (
        <Input
          type="email"
          placeholder="email@exemplo.com"
          maxLength={CUSTOM_FIELD_VALUE_MAX[FieldType.EMAIL]}
          value={value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          ref={field.ref as React.Ref<HTMLInputElement>}
        />
      )

    case FieldType.URL:
      return (
        <Input
          type="url"
          placeholder="https://exemplo.com"
          maxLength={CUSTOM_FIELD_VALUE_MAX[FieldType.URL]}
          value={value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          ref={field.ref as React.Ref<HTMLInputElement>}
        />
      )

    case FieldType.PHONE:
      return (
        <PhoneInput
          placeholder="(11) 99999-9999"
          maxLength={CUSTOM_FIELD_VALUE_MAX[FieldType.PHONE]}
          value={value}
          onChange={(newValue) => field.onChange(newValue ?? '')}
        />
      )

    case FieldType.CPF:
      return (
        <CpfInput
          value={value}
          onValueChange={(values) => field.onChange(values.value)}
          onBlur={field.onBlur}
          ref={field.ref as React.Ref<HTMLInputElement>}
        />
      )

    case FieldType.DATE:
      return (
        <Input
          type="date"
          value={value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          ref={field.ref as React.Ref<HTMLInputElement>}
        />
      )

    case FieldType.SELECT:
      return (
        <Select value={value || undefined} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            {(definition.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    default:
      return (
        <Input
          placeholder={definition.label}
          maxLength={CUSTOM_FIELD_VALUE_MAX[FieldType.TEXT]}
          value={value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={field.onBlur}
          ref={field.ref as React.Ref<HTMLInputElement>}
        />
      )
  }
}
