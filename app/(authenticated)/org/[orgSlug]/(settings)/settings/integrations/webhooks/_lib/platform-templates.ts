import type { FieldMappingKey } from '@/_actions/webhook-source/schema'
export type { FieldMappingKey }

export type WebhookPlatform =
  | 'GENERIC'
  | 'SHOPIFY'
  | 'NUVEM_SHOP'
  | 'HOTMART'
  | 'GOOGLE_FORMS'
  | 'OTHER'

export type WebhookEventType = 'UPSERT_CONTACT'

type Template = Partial<Record<WebhookEventType, Partial<Record<FieldMappingKey, string>>>>

export const PLATFORM_TEMPLATES: Record<WebhookPlatform, Template> = {
  GENERIC: {},
  OTHER: {},
  SHOPIFY: {
    UPSERT_CONTACT: {
      email: 'customer.email',
      name: 'customer.first_name',
      phone: 'customer.phone',
    },
  },
  HOTMART: {
    UPSERT_CONTACT: {
      email: 'data.buyer.email',
      name: 'data.buyer.name',
      phone: 'data.buyer.checkout_phone',
    },
  },
  GOOGLE_FORMS: {
    UPSERT_CONTACT: {
      name: 'responses.0.textAnswers.answers.0.value',
      email: 'responses.1.textAnswers.answers.0.value',
    },
  },
  NUVEM_SHOP: {
    UPSERT_CONTACT: {
      email: 'contact.email',
      name: 'contact.name',
      phone: 'contact.phone',
    },
  },
}

export const PLATFORM_LABELS: Record<WebhookPlatform, string> = {
  GENERIC: 'Genérico',
  SHOPIFY: 'Shopify',
  NUVEM_SHOP: 'Nuvem Shop',
  HOTMART: 'Hotmart',
  GOOGLE_FORMS: 'Google Forms',
  OTHER: 'Outro',
}

export const EVENT_TYPE_LABELS: Record<WebhookEventType, string> = {
  UPSERT_CONTACT: 'Contato (criar ou atualizar)',
}

export const PLATFORM_HMAC_HINTS: Record<WebhookPlatform, string | null> = {
  SHOPIFY: 'Header: X-Shopify-Hmac-Sha256 (HMAC-SHA256 em Base64)',
  NUVEM_SHOP: 'Header: X-Linkedstore-Hmac-Sha256 (HMAC-SHA256 em Base64)',
  HOTMART: 'Header: X-Hotmart-Hottok (token estático enviado pela Hotmart)',
  GENERIC: 'Header: X-Webhook-Signature no formato sha256=<hex>',
  OTHER: 'Header: X-Webhook-Signature no formato sha256=<hex>',
  GOOGLE_FORMS: null,
}

export const FIELD_MAPPING_KEY_LABELS: Record<FieldMappingKey, string> = {
  name: 'Nome',
  email: 'Email',
  phone: 'Telefone',
  companyName: 'Empresa',
  dealTitle: 'Título do deal',
  dealValue: 'Valor do deal',
  dealNotes: 'Notas do deal',
  dealStageId: 'Etapa do pipeline',
}
