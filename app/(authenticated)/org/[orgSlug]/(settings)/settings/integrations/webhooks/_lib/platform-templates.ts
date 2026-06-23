import type { FieldMappingKey } from '@/_actions/webhook-source/schema'
export type { FieldMappingKey }

export type WebhookPlatform =
  | 'GENERIC'
  | 'SHOPIFY'
  | 'NUVEM_SHOP'
  | 'HOTMART'
  | 'GOOGLE_FORMS'
  | 'KIWIFY'
  | 'WOOCOMMERCE'
  | 'CALENDLY'
  | 'EDUZZ'
  | 'MONETIZZE'
  | 'OTHER'

export type WebhookEventType = 'UPSERT_CONTACT'

type Template = Partial<
  Record<WebhookEventType, Partial<Record<FieldMappingKey, string>>>
>

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
  KIWIFY: {
    UPSERT_CONTACT: {
      email: 'Customer.email',
      name: 'Customer.full_name',
      phone: 'Customer.mobile',
    },
  },
  WOOCOMMERCE: {
    UPSERT_CONTACT: {
      email: 'billing.email',
      name: 'billing.first_name',
      phone: 'billing.phone',
    },
  },
  CALENDLY: {
    UPSERT_CONTACT: {
      email: 'payload.email',
      name: 'payload.name',
    },
  },
  MONETIZZE: {
    UPSERT_CONTACT: {
      email: 'comprador.email',
      name: 'comprador.nome',
      phone: 'comprador.telefone',
    },
  },
  // Eduzz tem payloads variáveis entre versões da API — sem template fixo.
  // O usuário detecta os campos via "Testar payload" (webhook-field-detector).
  EDUZZ: {},
}

export const PLATFORM_LABELS: Record<WebhookPlatform, string> = {
  GENERIC: 'Genérico',
  SHOPIFY: 'Shopify',
  NUVEM_SHOP: 'Nuvem Shop',
  HOTMART: 'Hotmart',
  GOOGLE_FORMS: 'Google Forms',
  KIWIFY: 'Kiwify',
  WOOCOMMERCE: 'WooCommerce',
  CALENDLY: 'Calendly',
  EDUZZ: 'Eduzz',
  MONETIZZE: 'Monetizze',
  OTHER: 'Outro',
}

// Logos das plataformas (assets locais em /public/images/providers).
// Plataformas sem logo (GENERIC/OTHER) caem no ícone genérico na UI.
export const PLATFORM_LOGOS: Partial<Record<WebhookPlatform, string>> = {
  SHOPIFY: '/images/providers/shopify.png',
  NUVEM_SHOP: '/images/providers/nuvemshop.png',
  HOTMART: '/images/providers/hotmart.png',
  GOOGLE_FORMS: '/images/providers/google-forms.png',
  KIWIFY: '/images/providers/kiwify.png',
  WOOCOMMERCE: '/images/providers/woocommerce.png',
  CALENDLY: '/images/providers/calendly.png',
  EDUZZ: '/images/providers/eduzz.png',
  MONETIZZE: '/images/providers/monetizze.svg',
}

export const EVENT_TYPE_LABELS: Record<WebhookEventType, string> = {
  UPSERT_CONTACT: 'Contato (criar ou atualizar)',
}

export const PLATFORM_HMAC_HINTS: Record<WebhookPlatform, string | null> = {
  SHOPIFY: 'Header: X-Shopify-Hmac-Sha256 (HMAC-SHA256 em Base64)',
  NUVEM_SHOP: 'Header: X-Linkedstore-Hmac-Sha256 (HMAC-SHA256 em Base64)',
  HOTMART: 'Header: X-Hotmart-Hottok (token estático enviado pela Hotmart)',
  WOOCOMMERCE: 'Header: X-WC-Webhook-Signature (HMAC-SHA256 em Base64)',
  GENERIC: 'Header: X-Webhook-Signature no formato sha256=<hex>',
  OTHER: 'Header: X-Webhook-Signature no formato sha256=<hex>',
  GOOGLE_FORMS: null,
  // Provedores com verificação real (barreira dura): informe o secret correto.
  CALENDLY:
    'Cole a Signing Key do webhook do Calendly. Validamos a assinatura nativa (Calendly-Webhook-Signature) com anti-replay.',
  EDUZZ:
    'Cole o token de origem do Myeduzz. Validamos esse token contra o que chega no corpo do webhook.',
  MONETIZZE:
    'Cole a chave única (chave_unica) da Monetizze. Validamos essa chave contra o que chega no corpo do webhook.',
  // Kiwify assina via query param (HMAC-SHA1), ainda não verificado: a segurança
  // vem do token único da URL. Deixe o secret em branco.
  KIWIFY:
    'Deixe o secret em branco — a segurança vem do token único da URL (a Kiwify assina via query param, ainda não verificado).',
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
