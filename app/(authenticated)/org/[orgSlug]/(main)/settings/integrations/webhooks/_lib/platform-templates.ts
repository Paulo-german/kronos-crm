import type { FieldMappingKey } from '@/_actions/webhook-source/schema'
export type { FieldMappingKey }

export type WebhookPlatform =
  | 'GENERIC'
  | 'SHOPIFY'
  | 'NUVEM_SHOP'
  | 'HOTMART'
  | 'GOOGLE_FORMS'
  | 'OTHER'

export type WebhookEventType =
  | 'NEW_CONTACT'
  | 'UPDATE_CONTACT'
  | 'NEW_DEAL'
  | 'UPDATE_DEAL'
  | 'DEAL_CLOSED'

type Template = Partial<Record<WebhookEventType, Partial<Record<FieldMappingKey, string>>>>

export const PLATFORM_TEMPLATES: Record<WebhookPlatform, Template> = {
  GENERIC: {},
  OTHER: {},
  SHOPIFY: {
    NEW_CONTACT: {
      email: 'customer.email',
      name: 'customer.first_name',
      phone: 'customer.phone',
    },
    NEW_DEAL: {
      email: 'customer.email',
      name: 'customer.first_name',
      dealTitle: 'name',
      dealValue: 'total_price',
    },
    DEAL_CLOSED: {
      email: 'customer.email',
      dealTitle: 'name',
    },
  },
  HOTMART: {
    NEW_CONTACT: {
      email: 'data.buyer.email',
      name: 'data.buyer.name',
      phone: 'data.buyer.checkout_phone',
    },
    NEW_DEAL: {
      email: 'data.buyer.email',
      name: 'data.buyer.name',
      dealTitle: 'data.product.name',
      dealValue: 'data.purchase.price.value',
    },
    DEAL_CLOSED: {
      email: 'data.buyer.email',
      dealTitle: 'data.product.name',
    },
  },
  GOOGLE_FORMS: {
    NEW_CONTACT: {
      name: 'responses.0.textAnswers.answers.0.value',
      email: 'responses.1.textAnswers.answers.0.value',
    },
  },
  NUVEM_SHOP: {
    NEW_CONTACT: {
      email: 'contact.email',
      name: 'contact.name',
      phone: 'contact.phone',
    },
    NEW_DEAL: {
      email: 'contact.email',
      dealTitle: 'order.number',
      dealValue: 'order.total',
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
  NEW_CONTACT: 'Novo contato',
  UPDATE_CONTACT: 'Atualizar contato',
  NEW_DEAL: 'Novo deal',
  UPDATE_DEAL: 'Atualizar deal',
  DEAL_CLOSED: 'Deal fechado',
}

export const FIELD_MAPPING_KEY_LABELS: Record<FieldMappingKey, string> = {
  name: 'Nome',
  email: 'Email',
  phone: 'Telefone',
  cpf: 'CPF',
  companyName: 'Empresa',
  dealTitle: 'Título do deal',
  dealValue: 'Valor do deal',
  dealNotes: 'Notas do deal',
  dealStageId: 'Etapa do pipeline',
}
