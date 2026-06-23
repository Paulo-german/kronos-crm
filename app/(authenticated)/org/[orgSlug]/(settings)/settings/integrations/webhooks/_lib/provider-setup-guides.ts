import type { WebhookPlatform } from './platform-templates'

export interface ProviderSetupGuide {
  // Passos leigos de onde colar o endereço de recebimento no painel do provedor.
  steps: string[]
  // Link para a documentação oficial (o painel do provedor é a fonte da verdade).
  docUrl: string
  // Aviso específico quando o provedor exige algo fora do comum (ex: Apps Script).
  caveat?: string
}

// Guias curtos e leigos. NÃO são contrato: painéis de provedor mudam de nome e
// lugar com frequência. Por isso o componente que os exibe SEMPRE mostra um
// disclaimer ("pode estar desatualizado, confirme no painel") e nunca bloqueia.
// GENERIC/OTHER ficam de fora de propósito (não há painel específico a guiar).
export const PROVIDER_SETUP_GUIDES: Partial<
  Record<WebhookPlatform, ProviderSetupGuide>
> = {
  SHOPIFY: {
    steps: [
      'No admin da Shopify, vá em Configurações → Notificações → Webhooks.',
      'Clique em "Criar webhook" e escolha o evento desejado.',
      'Em "Formato", selecione JSON e cole o endereço de recebimento acima.',
    ],
    docUrl:
      'https://help.shopify.com/manual/fulfillment/setup/notifications/webhooks',
  },
  WOOCOMMERCE: {
    steps: [
      'No painel do WordPress, vá em WooCommerce → Configurações → Avançado → Webhooks.',
      'Clique em "Adicionar webhook" e escolha o tópico (ex: Pedido atualizado).',
      'Cole o endereço de recebimento no campo "URL de entrega" e salve como Ativo.',
    ],
    docUrl: 'https://woocommerce.com/document/webhooks/',
  },
  NUVEM_SHOP: {
    steps: [
      'A Nuvem Shop configura webhooks via integração/app, não pelo painel da loja.',
      'Cadastre o endereço de recebimento acima como URL de notificação da integração.',
    ],
    docUrl: 'https://tiendanube.github.io/api-documentation/resources/webhook',
  },
  HOTMART: {
    steps: [
      'Na Hotmart, vá em Ferramentas → Webhook (API e Notificações).',
      'Clique em "Configurar Webhook" e selecione os eventos desejados.',
      'Cole o endereço de recebimento acima e salve.',
    ],
    docUrl: 'https://developers.hotmart.com/docs/pt-BR/webhook/about-webhook/',
  },
  KIWIFY: {
    steps: [
      'Na Kiwify, vá em Apps → Webhooks (ou Configurações → Webhooks).',
      'Clique em "Criar webhook" e selecione os eventos desejados.',
      'Cole o endereço de recebimento acima e salve.',
    ],
    docUrl: 'https://ajuda.kiwify.com.br/',
  },
  EDUZZ: {
    steps: [
      'Na Eduzz, vá em Ferramentas → Notificações (Webhooks) do Myeduzz.',
      'Adicione uma notificação e selecione os eventos desejados.',
      'Cole o endereço de recebimento acima como URL de destino.',
    ],
    docUrl: 'https://developers.eduzz.com/',
  },
  MONETIZZE: {
    steps: [
      'Na Monetizze, vá em Ferramentas → Integrações → Postback.',
      'Crie um postback e selecione os eventos desejados.',
      'Cole o endereço de recebimento acima como URL do postback.',
    ],
    docUrl: 'https://www.monetizze.com.br/',
  },
  CALENDLY: {
    steps: [
      'O Calendly cadastra webhooks via API (planos com acesso a webhooks).',
      'Use o endereço de recebimento acima como URL de assinatura do webhook.',
    ],
    docUrl:
      'https://developer.calendly.com/api-docs/ZG9jOjQ1MzAxNTc-webhook-subscriptions',
    caveat:
      'Webhooks do Calendly exigem um plano com acesso à API e são criados via integração, não pela tela de configurações comum.',
  },
  GOOGLE_FORMS: {
    steps: [
      'No formulário, abra o editor de Apps Script (menu ⋮ → Editor de scripts).',
      'Crie um gatilho onFormSubmit que envie as respostas para o endereço acima.',
      'Inclua um campo "source" no corpo enviado se quiser usar o filtro de gatilho.',
    ],
    docUrl: 'https://developers.google.com/apps-script/guides/triggers',
    caveat:
      'O Google Forms não envia webhooks nativamente — é preciso um Apps Script. Ele também não suporta verificação de assinatura.',
  },
}
