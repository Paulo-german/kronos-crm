import type { WebhookPlatform } from '@prisma/client'

// Categorias canônicas do ciclo de vida (gatilho → efeito, usado depois).
// Fonte: docs/INTEGRATIONS-WEBHOOK-EVENTS.md
export type CanonicalCategory =
  | 'contact_created'
  | 'order_created'
  | 'payment_pending'
  | 'payment_approved'
  | 'abandoned'
  | 'refund_chargeback'
  | 'subscription_canceled'
  | 'meeting_scheduled'
  | 'meeting_canceled'
  | 'form_submitted'
  | 'other'

// Como detectar o identificador do evento neste provedor:
// - 'header': o tipo do evento vem num header HTTP (Shopify, WooCommerce)
// - 'payloadField': o tipo do evento vem num campo do corpo JSON (demais)
export type EventDetectionMode = 'header' | 'payloadField'

export interface ProviderEvent {
  // Identificador técnico persistido em WebhookSource.providerEvent (ex: 'orders/paid')
  id: string
  // Rótulo PT-BR exibido no dropdown
  label: string
  // Descrição leiga (inclui lição Zapier "Novo" vs "Novo/Atualizado")
  description: string
  // Categoria canônica (gatilho → efeito, usado depois)
  category: CanonicalCategory
}

export interface ProviderEventCatalog {
  mode: EventDetectionMode
  // Para 'header': nome do header (lowercase). Para 'payloadField': dot-path no payload.
  source: string
  // Provedores com 2 sinais (Woo topic + status; Monetizze status + tipoEvento):
  // caminho secundário usado pelo matcher quando o id principal não basta.
  secondarySource?: string
  events: ProviderEvent[]
}

// GENERIC/OTHER ficam FORA do catálogo de propósito: sem catálogo => resolver
// retorna noCatalog=true => nunca filtra (comportamento legado, aceita qualquer evento).
export const WEBHOOK_EVENT_CATALOG: Partial<
  Record<WebhookPlatform, ProviderEventCatalog>
> = {
  SHOPIFY: {
    mode: 'header',
    source: 'x-shopify-topic',
    events: [
      {
        id: 'customers/create',
        label: 'Cliente criado',
        description: 'Dispara quando um novo cliente é cadastrado na loja.',
        category: 'contact_created',
      },
      {
        id: 'orders/create',
        label: 'Pedido criado',
        description:
          'Dispara apenas na criação do pedido (não dispara em atualizações posteriores).',
        category: 'order_created',
      },
      {
        id: 'orders/paid',
        label: 'Pedido pago',
        description: 'Dispara quando o pedido é marcado como pago.',
        category: 'payment_approved',
      },
      {
        id: 'orders/cancelled',
        label: 'Pedido cancelado',
        description: 'Dispara quando o pedido é cancelado.',
        category: 'other',
      },
      {
        id: 'refunds/create',
        label: 'Reembolso criado',
        description: 'Dispara quando um reembolso é registrado no pedido.',
        category: 'refund_chargeback',
      },
    ],
  },

  WOOCOMMERCE: {
    mode: 'header',
    source: 'x-wc-webhook-topic',
    // Pós-criação, tudo vem como order.updated; discriminamos pelo `status` do payload.
    secondarySource: 'status',
    events: [
      {
        id: 'customer.created',
        label: 'Cliente criado',
        description: 'Dispara quando um novo cliente é cadastrado.',
        category: 'contact_created',
      },
      {
        id: 'order.created',
        label: 'Pedido criado',
        description:
          'Dispara apenas na criação do pedido (nasce com status "pending").',
        category: 'order_created',
      },
      {
        id: 'order.updated:pending',
        label: 'Aguardando pagamento',
        description:
          'Dispara quando o pedido fica aguardando pagamento (pending, on-hold ou failed). Como o Woo manda tudo como "pedido atualizado", filtramos pelo status.',
        category: 'payment_pending',
      },
      {
        id: 'order.updated:processing',
        label: 'Pedido pago',
        description:
          'Dispara em atualização de status para "processing" ou "completed".',
        category: 'payment_approved',
      },
      {
        id: 'order.updated:cancelled',
        label: 'Pedido cancelado',
        description: 'Dispara quando o status do pedido muda para "cancelled".',
        category: 'other',
      },
      {
        id: 'order.updated:refunded',
        label: 'Pedido estornado',
        description: 'Dispara quando o status do pedido muda para "refunded".',
        category: 'refund_chargeback',
      },
    ],
  },

  NUVEM_SHOP: {
    mode: 'payloadField',
    source: 'event',
    events: [
      {
        id: 'customer/created',
        label: 'Cliente criado',
        description: 'Dispara quando um novo cliente é cadastrado.',
        category: 'contact_created',
      },
      {
        id: 'order/created',
        label: 'Pedido criado',
        description: 'Dispara apenas na criação do pedido.',
        category: 'order_created',
      },
      {
        id: 'order/pending',
        label: 'Pagamento pendente',
        description: 'Dispara quando o pedido fica aguardando pagamento.',
        category: 'payment_pending',
      },
      {
        id: 'order/paid',
        label: 'Pedido pago',
        description: 'Dispara quando o pedido é marcado como pago.',
        category: 'payment_approved',
      },
      {
        id: 'order/cancelled',
        label: 'Pedido cancelado',
        description: 'Dispara quando o pedido é cancelado.',
        category: 'other',
      },
      {
        id: 'order/voided',
        label: 'Pedido estornado',
        description: 'Dispara quando o pedido é estornado.',
        category: 'refund_chargeback',
      },
    ],
  },

  HOTMART: {
    mode: 'payloadField',
    source: 'event',
    events: [
      {
        id: 'PURCHASE_APPROVED',
        label: 'Venda aprovada',
        description: 'Dispara quando o pagamento da compra é aprovado.',
        category: 'payment_approved',
      },
      {
        id: 'PURCHASE_COMPLETE',
        label: 'Compra concluída',
        description: 'Dispara quando a compra é concluída (pós-garantia).',
        category: 'other',
      },
      {
        id: 'PURCHASE_BILLET_PRINTED',
        label: 'Boleto gerado (aguardando)',
        description: 'Dispara quando o boleto é gerado e aguarda pagamento.',
        category: 'payment_pending',
      },
      {
        id: 'PURCHASE_EXPIRED',
        label: 'Compra expirada',
        description: 'Dispara quando a compra expira sem pagamento.',
        category: 'payment_pending',
      },
      {
        id: 'PURCHASE_CANCELED',
        label: 'Compra cancelada',
        description: 'Dispara quando a compra é cancelada.',
        category: 'refund_chargeback',
      },
      {
        id: 'PURCHASE_REFUNDED',
        label: 'Reembolso',
        description: 'Dispara quando a compra é reembolsada.',
        category: 'refund_chargeback',
      },
      {
        id: 'PURCHASE_CHARGEBACK',
        label: 'Chargeback',
        description: 'Dispara quando há um chargeback na compra.',
        category: 'refund_chargeback',
      },
      {
        id: 'PURCHASE_OUT_OF_SHOPPING_CART',
        label: 'Carrinho abandonado',
        description:
          'Dispara quando o comprador abandona o carrinho sem concluir a compra.',
        category: 'abandoned',
      },
      {
        id: 'SUBSCRIPTION_CANCELLATION',
        label: 'Assinatura cancelada',
        description: 'Dispara quando uma assinatura é cancelada.',
        category: 'subscription_canceled',
      },
    ],
  },

  KIWIFY: {
    mode: 'payloadField',
    source: 'order_status',
    events: [
      {
        id: 'paid',
        label: 'Venda aprovada',
        description: 'Dispara quando o pagamento é aprovado.',
        category: 'payment_approved',
      },
      {
        id: 'waiting_payment',
        label: 'Pagamento pendente (Pix/Boleto gerado)',
        description:
          'Dispara quando o Pix ou boleto é gerado e aguarda pagamento.',
        category: 'payment_pending',
      },
      {
        id: 'refunded',
        label: 'Reembolso',
        description: 'Dispara quando a compra é reembolsada.',
        category: 'refund_chargeback',
      },
      {
        id: 'chargedback',
        label: 'Chargeback',
        description: 'Dispara quando há um chargeback na compra.',
        category: 'refund_chargeback',
      },
    ],
  },

  EDUZZ: {
    mode: 'payloadField',
    source: 'event',
    events: [
      {
        id: 'myeduzz.invoice_paid',
        label: 'Fatura paga',
        description: 'Dispara quando a fatura é paga.',
        category: 'payment_approved',
      },
      {
        id: 'myeduzz.invoice_scheduled',
        label: 'Boleto/Pix gerado (aguardando)',
        description:
          'Dispara quando boleto ou Pix é gerado e aguarda pagamento.',
        category: 'payment_pending',
      },
      {
        id: 'myeduzz.invoice_expired',
        label: 'Fatura expirada',
        description: 'Dispara quando a fatura expira sem pagamento.',
        category: 'abandoned',
      },
      {
        id: 'myeduzz.invoice_canceled',
        label: 'Fatura cancelada',
        description: 'Dispara quando a fatura é cancelada.',
        category: 'refund_chargeback',
      },
      {
        id: 'myeduzz.invoice_waiting_refund',
        label: 'Aguardando reembolso',
        description:
          'Dispara no início do ciclo de reembolso (não há evento "reembolsado" dedicado).',
        category: 'refund_chargeback',
      },
      {
        id: 'myeduzz.contract_updated',
        label: 'Assinatura cancelada',
        description:
          'Dispara em atualização de contrato; usado para detectar cancelamento de assinatura.',
        category: 'subscription_canceled',
      },
    ],
  },

  MONETIZZE: {
    mode: 'payloadField',
    source: 'venda.codigo_status',
    // Abandono (7) e cancelamento de assinatura (103) só vêm em tipoEvento.codigo.
    secondarySource: 'tipoEvento.codigo',
    events: [
      {
        id: '1',
        label: 'Boleto/Pix gerado (aguardando)',
        description: 'Dispara quando a venda fica aguardando pagamento.',
        category: 'payment_pending',
      },
      {
        id: '2',
        label: 'Venda aprovada',
        description: 'Dispara quando a venda é finalizada (paga).',
        category: 'payment_approved',
      },
      {
        id: '3',
        label: 'Cancelada',
        description: 'Dispara quando a venda é cancelada.',
        category: 'refund_chargeback',
      },
      {
        id: '4',
        label: 'Reembolso / Estorno / Chargeback',
        description:
          'Dispara quando a venda é devolvida. A Monetizze não distingue reembolso, estorno e chargeback — todos chegam como "Devolvida".',
        category: 'refund_chargeback',
      },
      {
        id: '5',
        label: 'Em disputa',
        description: 'Dispara quando a venda é bloqueada/entra em disputa.',
        category: 'refund_chargeback',
      },
      {
        id: 'tipoEvento:7',
        label: 'Carrinho abandonado',
        description:
          'Dispara quando o comprador abandona o carrinho (identificado por tipoEvento.codigo = 7).',
        category: 'abandoned',
      },
      {
        id: 'tipoEvento:103',
        label: 'Assinatura cancelada',
        description:
          'Dispara quando uma assinatura é cancelada (identificado por tipoEvento.codigo = 103).',
        category: 'subscription_canceled',
      },
    ],
  },

  CALENDLY: {
    mode: 'payloadField',
    source: 'event',
    events: [
      {
        id: 'invitee.created',
        label: 'Reunião marcada',
        description: 'Dispara quando um convidado agenda uma reunião.',
        category: 'meeting_scheduled',
      },
      {
        id: 'invitee.canceled',
        label: 'Reunião cancelada',
        description: 'Dispara quando uma reunião é cancelada.',
        category: 'meeting_canceled',
      },
      {
        id: 'routing_form_submission.created',
        label: 'Form de roteamento enviado',
        description: 'Dispara quando um formulário de roteamento é enviado.',
        category: 'form_submitted',
      },
      {
        id: 'invitee_no_show.created',
        label: 'Não compareceu (no-show)',
        description:
          'Dispara quando o convidado é marcado como não comparecido.',
        category: 'other',
      },
    ],
  },

  GOOGLE_FORMS: {
    // Sem evento nativo: o "evento" depende de um campo `source` que o usuário
    // injeta no Apps Script. O filtro só funciona se o usuário injetar esse campo.
    mode: 'payloadField',
    source: 'source',
    events: [
      {
        id: 'form_submitted',
        label: 'Formulário enviado',
        description:
          'Dispara quando o formulário é enviado. Requer um Apps Script (onFormSubmit) que envie os dados para este endereço.',
        category: 'form_submitted',
      },
    ],
  },
}
