import { z } from 'zod'
import { EntityType, FieldType } from '@prisma/client'
import {
  FIELD_OPTION_LABEL_MAX,
  FIELD_OPTION_VALUE_MAX,
} from '@/_lib/constants/field-limits'

// Tipos de campo personalizáveis no MVP (evita magic strings espalhadas)
export const CUSTOM_FIELD_TYPES = [
  FieldType.TEXT,
  FieldType.NUMBER,
  FieldType.SELECT,
  FieldType.DATE,
  FieldType.PHONE,
  FieldType.EMAIL,
  FieldType.URL,
  FieldType.CPF,
] as const

export const fieldOptionSchema = z.object({
  label: z.string().trim().min(1).max(FIELD_OPTION_LABEL_MAX),
  value: z.string().trim().min(1).max(FIELD_OPTION_VALUE_MAX),
})

export interface FieldOption {
  label: string
  value: string
}

// DTO de leitura — `options` já tipado (Prisma retorna Json cru)
export interface FieldDefinitionDto {
  id: string
  entityType: EntityType
  key: string
  label: string
  type: FieldType
  isSystem: boolean
  isRequired: boolean
  options: FieldOption[] | null
  position: number
  /** Quantidade de registros que já usaram este campo. Usado para aviso de deleção. */
  valueCount: number
}
