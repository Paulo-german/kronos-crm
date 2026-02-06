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
}

export const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Gratuito',
    description: 'Ideal para começar a organizar seus contatos e negócios.',
    price: 0,
    priceLabel: 'R$ 0/mês',
    cta: 'Plano atual',
    features: [
      { name: 'Até 50 contatos', included: true },
      { name: 'Até 25 negócios', included: true },
      { name: 'Até 10 produtos', included: true },
      { name: 'Até 2 membros', included: true },
      { name: 'Pipeline de vendas', included: true },
      { name: 'Suporte por email', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Profissional',
    description: 'Para equipes em crescimento que precisam de mais recursos.',
    price: 79,
    priceLabel: 'R$ 79/mês',
    cta: 'Fazer upgrade',
    highlighted: true,
    features: [
      { name: 'Até 1.000 contatos', included: true },
      { name: 'Até 500 negócios', included: true },
      { name: 'Até 100 produtos', included: true },
      { name: 'Até 10 membros', included: true },
      { name: 'Pipeline de vendas', included: true },
      { name: 'Suporte prioritário', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Empresarial',
    description: 'Para grandes equipes com necessidades avançadas.',
    price: 199,
    priceLabel: 'R$ 199/mês',
    cta: 'Falar com vendas',
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
  free: string | boolean
  pro: string | boolean
  enterprise: string | boolean
}

export const COMPARISON_DATA: ComparisonRow[] = [
  { feature: 'Contatos', free: '50', pro: '1.000', enterprise: 'Ilimitado' },
  { feature: 'Negócios', free: '25', pro: '500', enterprise: 'Ilimitado' },
  { feature: 'Produtos', free: '10', pro: '100', enterprise: 'Ilimitado' },
  { feature: 'Membros da equipe', free: '2', pro: '10', enterprise: 'Ilimitado' },
  { feature: 'Pipeline de vendas', free: true, pro: true, enterprise: true },
  { feature: 'Kanban de negócios', free: true, pro: true, enterprise: true },
  { feature: 'Importação de contatos', free: false, pro: true, enterprise: true },
  { feature: 'Exportação de dados', free: false, pro: true, enterprise: true },
  { feature: 'Relatórios avançados', free: false, pro: true, enterprise: true },
  { feature: 'API de integração', free: false, pro: false, enterprise: true },
  { feature: 'SSO / SAML', free: false, pro: false, enterprise: true },
  { feature: 'Suporte', free: 'Email', pro: 'Prioritário', enterprise: 'Dedicado 24/7' },
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
    question: 'Existe período de teste para os planos pagos?',
    answer:
      'Sim! Oferecemos 14 dias de teste gratuito para o plano Profissional. Você pode experimentar todos os recursos sem compromisso. Não é necessário cartão de crédito para iniciar o teste.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer:
      'Aceitamos cartões de crédito (Visa, Mastercard, American Express), boleto bancário e PIX. Para o plano Empresarial, também oferecemos faturamento mensal via nota fiscal.',
  },
  {
    question: 'Posso cancelar minha assinatura?',
    answer:
      'Sim, você pode cancelar sua assinatura a qualquer momento. Após o cancelamento, você continuará tendo acesso aos recursos do plano pago até o final do período já pago. Depois disso, sua conta será automaticamente convertida para o plano Gratuito.',
  },
]
