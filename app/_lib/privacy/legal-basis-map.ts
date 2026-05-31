import { CaptureChannel, LegalBasis, LegalBasisSource } from '@prisma/client'

export interface ChannelLegalBasis {
  legalBasis: LegalBasis
  legalBasisSource: LegalBasisSource
}

// Mapa canônico canal -> base legal. Cobre EXATAMENTE os 13 valores reais de CaptureChannel.
// Single source of truth: consumido por todos os fluxos de criação de contato e pelo backfill.
// NUNCA duplicar essa lógica inline nas actions.
export const CHANNEL_DEFAULT_LEGAL_BASIS: Record<
  CaptureChannel,
  ChannelLegalBasis
> = {
  // Consentimento explícito (titular preencheu formulário / opt-in)
  EMBED_FORM: { legalBasis: 'CONSENT', legalBasisSource: 'EMBED_FORM' },
  // Lead form Meta = opt-in do titular
  FACEBOOK_LEAD: { legalBasis: 'CONSENT', legalBasisSource: 'EMBED_FORM' },
  // Inbound do titular via canais de mensagem -> legítimo interesse
  WHATSAPP: {
    legalBasis: 'LEGITIMATE_INTEREST',
    legalBasisSource: 'WHATSAPP_INBOUND',
  },
  INSTAGRAM: {
    legalBasis: 'LEGITIMATE_INTEREST',
    legalBasisSource: 'WHATSAPP_INBOUND',
  },
  WEBSITE_CHAT: {
    legalBasis: 'LEGITIMATE_INTEREST',
    legalBasisSource: 'WHATSAPP_INBOUND',
  },
  EMAIL: { legalBasis: 'LEGITIMATE_INTEREST', legalBasisSource: 'API' },
  PHONE_CALL: {
    legalBasis: 'LEGITIMATE_INTEREST',
    legalBasisSource: 'MANUAL_CREATION',
  },
  IN_PERSON: {
    legalBasis: 'LEGITIMATE_INTEREST',
    legalBasisSource: 'MANUAL_CREATION',
  },
  // Import (sobrescrito pela seleção do operador no stepper)
  IMPORT: { legalBasis: 'LEGITIMATE_INTEREST', legalBasisSource: 'IMPORT' },
  // Captura programática / origens de marketing
  API: { legalBasis: 'LEGITIMATE_INTEREST', legalBasisSource: 'API' },
  REFERRAL: { legalBasis: 'LEGITIMATE_INTEREST', legalBasisSource: 'API' },
  EVENT: { legalBasis: 'LEGITIMATE_INTEREST', legalBasisSource: 'API' },
  // Desconhecido (inclui criação manual sem canal explícito) -> fallback conservador
  UNKNOWN: { legalBasis: 'LEGITIMATE_INTEREST', legalBasisSource: 'API' },
}

// Lookup que trata firstCaptureChannel nullable (Contact.firstCaptureChannel é CaptureChannel?).
export const resolveLegalBasisForChannel = (
  channel: CaptureChannel | null,
): ChannelLegalBasis =>
  CHANNEL_DEFAULT_LEGAL_BASIS[channel ?? CaptureChannel.UNKNOWN]
