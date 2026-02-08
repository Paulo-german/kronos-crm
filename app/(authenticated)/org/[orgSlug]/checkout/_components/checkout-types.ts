export type PlanInterval = 'monthly' | 'annual'

export interface CheckoutSearchParams {
  plan?: string
  interval?: PlanInterval
  seats?: string
}

export const CHECKOUT_STEPS = [
  { id: 'configure', label: 'Configurar', path: '/checkout/configure' },
  { id: 'register', label: 'Cadastro', path: '/checkout/register' },
  { id: 'payment', label: 'Pagamento', path: '/checkout/payment' },
] as const

export type CheckoutStepId = (typeof CHECKOUT_STEPS)[number]['id']
