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
  features: PlanFeature[]
  highlighted?: boolean
  cta: string
  stripePriceId?: string
  stripePriceIdAnnual?: string
  /** Valor total cobrado no ano (ex: 1970 = R$1.970/ano). A mensalidade equivalente e o desconto são calculados automaticamente. */
  annualTotalPrice?: number
}

/** Calcula mensalidade equivalente e % de desconto a partir do preço anual total */
export function getAnnualDetails(plan: PlanInfo) {
  if (!plan.annualTotalPrice) return null
  const monthlyEquivalent = plan.annualTotalPrice / 12
  const discountPercent = Math.round(
    (1 - plan.annualTotalPrice / (plan.price * 12)) * 100,
  )
  return { monthlyEquivalent, discountPercent }
}

export const PLANS: PlanInfo[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Para profissionais solo que querem organizar seu pipeline.',
    price: 147,
    priceLabel: 'R$ 147/mês',
    cta: 'Assinar Light',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_LIGHT_PRICE_ID,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_LIGHT_ANNUAL_PRICE_ID,
    annualTotalPrice: 1367.9, // TODO: valor total do ano em reais (ex: 1970)
    features: [
      { name: '1 usuário', included: true },
      { name: '1 agente IA + 300 mensagens', included: true },
      { name: '1 canal Inbox', included: true },
      { name: 'Até 5.000 contatos', included: true },
      { name: 'Até 5.000 negócios', included: true },
      { name: 'Até 2.000 empresas', included: true },
    ],
  },
  {
    id: 'essential',
    name: 'Essential',
    description: 'O Início — para equipes pequenas organizarem vendas.',
    price: 397,
    priceLabel: 'R$ 397/mês',
    cta: 'Assinar Essential',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ESSENTIAL_PRICE_ID,
    stripePriceIdAnnual:
      process.env.NEXT_PUBLIC_STRIPE_ESSENTIAL_ANNUAL_PRICE_ID,
    annualTotalPrice: 4287.9, // TODO: valor total do ano em reais (ex: 3970)
    features: [
      { name: '3 usuários (+R$30/adicional)', included: true },
      { name: '2 agentes IA + 800 mensagens', included: true },
      { name: '1 canal Inbox', included: true },
      { name: 'Até 25.000 contatos', included: true },
      { name: 'Até 25.000 negócios', included: true },
      { name: 'Até 10.000 empresas', included: true },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'O Motor — para equipes em crescimento com automação.',
    price: 697,
    priceLabel: 'R$ 697/mês',
    cta: 'Assinar Scale',
    highlighted: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_SCALE_ANNUAL_PRICE_ID,
    annualTotalPrice: 7527.9, // TODO: valor total do ano em reais (ex: 6970)
    features: [
      { name: '8 usuários (+R$20/adicional)', included: true },
      { name: '5 agentes IA + 1.800 mensagens', included: true },
      { name: '3 canais Inbox', included: true },
      { name: 'Até 50.000 contatos', included: true },
      { name: 'Até 50.000 negócios', included: true },
      { name: 'Até 20.000 empresas', included: true },
      { name: 'Automações', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'A Nave — para grandes operações com recursos avançados.',
    price: 1197,
    priceLabel: 'R$ 1.197/mês',
    cta: 'Assinar Enterprise',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    stripePriceIdAnnual:
      process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
    annualTotalPrice: 12927.9, // TODO: valor total do ano em reais (ex: 11970)
    features: [
      { name: '12 usuários (+R$20/adicional)', included: true },
      { name: '10 agentes IA + 2.500 mensagens', included: true },
      { name: '10 canais Inbox', included: true },
      { name: 'Até 50.000 contatos', included: true },
      { name: 'Até 50.000 negócios', included: true },
      { name: 'Até 20.000 empresas', included: true },
      { name: 'Automações', included: true },
      { name: 'API de integração', included: true },
      { name: 'SSO / SAML', included: true },
    ],
  },
]

export interface ComparisonRow {
  feature: string
  light: string | boolean
  essential: string | boolean
  scale: string | boolean
  enterprise: string | boolean
}

export const COMPARISON_DATA: ComparisonRow[] = [
  {
    feature: 'Contatos',
    light: '5.000',
    essential: '25.000',
    scale: '50.000',
    enterprise: '50.000',
  },
  {
    feature: 'Negócios',
    light: '5.000',
    essential: '25.000',
    scale: '50.000',
    enterprise: '50.000',
  },
  {
    feature: 'Empresas',
    light: '2.000',
    essential: '10.000',
    scale: '20.000',
    enterprise: '20.000',
  },
  {
    feature: 'Usuários inclusos',
    light: '1',
    essential: '3',
    scale: '8',
    enterprise: '12',
  },
  {
    feature: 'Usuário adicional',
    light: '-',
    essential: 'R$30/mês',
    scale: 'R$20/mês',
    enterprise: 'R$20/mês',
  },
  {
    feature: 'Agentes IA',
    light: '1',
    essential: '2',
    scale: '5',
    enterprise: '10',
  },
  {
    feature: 'Mensagens IA',
    light: '100',
    essential: '400',
    scale: '1.200',
    enterprise: '2.500',
  },
  {
    feature: 'Canais Inbox',
    light: '1',
    essential: '1',
    scale: '3',
    enterprise: '10',
  },
  {
    feature: 'Pipeline de vendas',
    light: true,
    essential: true,
    scale: true,
    enterprise: true,
  },
  {
    feature: 'Kanban de negócios',
    light: true,
    essential: true,
    scale: true,
    enterprise: true,
  },
  {
    feature: 'Carteira de IA',
    light: true,
    essential: true,
    scale: true,
    enterprise: true,
  },
  {
    feature: 'Automações',
    light: false,
    essential: false,
    scale: true,
    enterprise: true,
  },
  {
    feature: 'Importação de contatos',
    light: false,
    essential: false,
    scale: true,
    enterprise: true,
  },
  {
    feature: 'Exportação de dados',
    light: false,
    essential: false,
    scale: true,
    enterprise: true,
  },
  {
    feature: 'API de integração',
    light: false,
    essential: false,
    scale: false,
    enterprise: true,
  },
  {
    feature: 'SSO / SAML',
    light: false,
    essential: false,
    scale: false,
    enterprise: true,
  },
  {
    feature: 'Suporte',
    light: 'Email',
    essential: 'Email',
    scale: 'Prioritário',
    enterprise: 'Dedicado 24/7',
  },
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
