import type { PromptConfig } from './prompt-config-schema'

export const ROLE_LABELS: Record<
  Exclude<PromptConfig['role'], 'custom'>,
  string
> = {
  sdr: 'SDR (pré-vendas e qualificação de leads)',
  closer: 'Closer de vendas (negociação e fechamento)',
  support: 'Atendente de suporte ao cliente',
  receptionist: 'Recepcionista (triagem e direcionamento)',
}

export const TONE_INSTRUCTIONS: Record<PromptConfig['tone'], string> = {
  formal: 'formal e corporativo',
  professional: 'profissional e objetivo',
  friendly: 'amigável e acolhedor',
  casual: 'casual e descontraído',
}

export const LENGTH_INSTRUCTIONS: Record<
  PromptConfig['responseLength'],
  string
> = {
  short: 'curtas e diretas (1-2 frases por mensagem)',
  medium: 'moderadas (2-4 frases por mensagem)',
  detailed: 'detalhadas e completas',
}

export const LANGUAGE_INSTRUCTIONS: Record<PromptConfig['language'], string> = {
  'pt-BR': 'português brasileiro',
  en: 'inglês',
  es: 'espanhol',
  auto: 'o mesmo idioma que o cliente usar',
}
