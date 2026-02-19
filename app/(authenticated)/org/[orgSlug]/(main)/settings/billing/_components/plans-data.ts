import type { PlanType } from '@/_lib/rbac/plan-limits'

export interface PlanFeature {
  name: string
  included: boolean | string
}

export interface PlanInfo {
  id: PlanType
  name: string
  description: string
  price: number
  priceLabel: string
  annualPrice?: number
  annualTotalPrice?: number
  discountPercent?: number
  features: PlanFeature[]
  highlighted?: boolean
  cta: string
  stripePriceId?: string
  stripePriceIdAnnual?: string
}

export const PLANS: PlanInfo[] = [
  {
    id: 'essential',
    name: 'Essential',
    description: 'Ideal para começar: 7 dias grátis, sem cartão de crédito.',
    price: 49.9,
    priceLabel: 'R$ 49,90/mês',
    cta: 'Assinar Essential',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESSENTIAL_PRICE_ID,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_ESSENTIAL_ANNUAL_PRICE_ID,
    features: [
      { name: 'Até 500 contatos', included: true },
      { name: 'Até 250 negócios', included: true },
      { name: 'Até 25 produtos', included: true },
      { name: 'Até 5 membros', included: true },
      { name: 'Pipeline de vendas', included: true },
      { name: 'Suporte por email', included: true },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'Para equipes em crescimento que precisam de mais recursos.',
    price: 119.9,
    priceLabel: 'R$ 119,90/mês',
    annualPrice: 95.92,
    annualTotalPrice: 1150.8,
    discountPercent: 20,
    cta: 'Fazer upgrade',
    highlighted: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_SCALE_ANNUAL_PRICE_ID,
    features: [
      { name: 'Até 5.000 contatos', included: true },
      { name: 'Até 2.500 negócios', included: true },
      { name: 'Até 100 produtos', included: true },
      { name: 'Até 15 membros', included: true },
      { name: 'Pipeline de vendas', included: true },
      { name: 'Suporte prioritário', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Para grandes equipes com necessidades avançadas.',
    price: 199,
    priceLabel: 'R$ 199/mês',
    annualPrice: 159.2,
    annualTotalPrice: 1910.4,
    discountPercent: 20,
    cta: 'Falar com vendas',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
    features: [
      { name: 'Contatos ilimitados', included: true },
      { name: 'Negócios ilimitados', included: true },
      { name: 'Produtos ilimitados', included: true },
      { name: 'Membros ilimitados', included: true },
      { name: 'Pipeline de vendas', included: true },
      { name: 'Suporte dedicado', included: true },
    ],
  },
]

export interface ComparisonRow {
  feature: string
  essential: string | boolean
  scale: string | boolean
  enterprise: string | boolean
}

export const COMPARISON_DATA: ComparisonRow[] = [
  { feature: 'Contatos', essential: '500', scale: '5.000', enterprise: 'Ilimitado' },
  { feature: 'Negócios', essential: '250', scale: '2.500', enterprise: 'Ilimitado' },
  { feature: 'Produtos', essential: '25', scale: '100', enterprise: 'Ilimitado' },
  { feature: 'Membros da equipe', essential: '5', scale: '15', enterprise: 'Ilimitado' },
  { feature: 'Pipeline de vendas', essential: true, scale: true, enterprise: true },
  { feature: 'Kanban de negócios', essential: true, scale: true, enterprise: true },
  { feature: 'Importação de contatos', essential: false, scale: true, enterprise: true },
  { feature: 'Exportação de dados', essential: false, scale: true, enterprise: true },
  { feature: 'Relatórios avançados', essential: false, scale: true, enterprise: true },
  { feature: 'API de integração', essential: false, scale: false, enterprise: true },
  { feature: 'SSO / SAML', essential: false, scale: false, enterprise: true },
  { feature: 'Suporte', essential: 'Email', scale: 'Prioritário', enterprise: 'Dedicado 24/7' },
]

export interface FaqItem {
  question: string
  answer: string
}

export const FAQ_DATA: FaqItem[] = [
  {
    question: 'Posso mudar de plano a qualquer momento?',
    answer:
      'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. Ao fazer upgrade, você terá acesso imediato aos novos recursos. Ao fazer downgrade, a mudança será aplicada no próximo ciclo de cobrança.',
  },
  {
    question: 'O que acontece se eu exceder os limites do meu plano?',
    answer:
      'Você receberá um aviso quando estiver próximo do limite. Ao atingir o limite, não será possível adicionar novos registros até fazer upgrade do plano ou remover registros existentes.',
  },
  {
    question: 'Existe período de teste?',
    answer:
      'Sim! Toda nova organização tem 7 dias de trial gratuito no plano Essential. Você pode experimentar os recursos sem compromisso. Não é necessário cartão de crédito para iniciar o trial.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer:
      'Aceitamos cartões de crédito (Visa, Mastercard, American Express), boleto bancário e PIX. Para o plano Enterprise, também oferecemos faturamento mensal via nota fiscal.',
  },
  {
    question: 'Posso cancelar minha assinatura?',
    answer:
      'Sim, você pode cancelar sua assinatura a qualquer momento. Após o cancelamento, você continuará tendo acesso aos recursos do plano pago até o final do período já pago. Depois disso, o acesso será bloqueado até a assinatura de um novo plano.',
  },
]
