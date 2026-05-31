import { FieldType } from '@prisma/client'

// Campos nativos de contato
export const CONTACT_NAME_MAX = 70
export const CONTACT_EMAIL_MAX = 120
export const CONTACT_PHONE_MAX = 20
export const CONTACT_ROLE_MAX = 100
export const CONTACT_INLINE_DEAL_TITLE_MAX = 80
export const CONTACT_COMPANY_NAME_MAX = 200
export const CONTACT_PRIVACY_NOTES_MAX = 1000

// Definição de campo personalizado
export const FIELD_DEFINITION_LABEL_MAX = 100
export const FIELD_DEFINITION_OPTIONS_MAX = 50
export const FIELD_OPTION_LABEL_MAX = 100
export const FIELD_OPTION_VALUE_MAX = 100

// Valores de campos personalizados por tipo
export const CUSTOM_FIELD_VALUE_MAX: Partial<Record<FieldType, number>> = {
  [FieldType.TEXT]: 500,
  [FieldType.NUMBER]: 250,
  [FieldType.EMAIL]: 120,
  [FieldType.URL]: 500,
  [FieldType.PHONE]: 20,
  // DATE, CPF e SELECT não têm limite de string — controlados por formato/opções
}

// Backstop do schema da action (aceita qualquer tipo antes da validação por tipo no serialize)
export const CUSTOM_FIELD_VALUE_SCHEMA_MAX = 5000
