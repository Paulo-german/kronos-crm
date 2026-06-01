import type { LegalBasis, LegalBasisSource, ConsentEventType, DsrRequestType, DsrRequestStatus } from '@prisma/client'

// ─── Base Legal ─────────────────────────────────────────────────────────────

export interface LegalBasisVisualConfig {
  label: string
  description: string
  badgeClassName: string
}

export const LEGAL_BASIS_CONFIG: Record<LegalBasis, LegalBasisVisualConfig> = {
  CONSENT: {
    label: 'Autorização do contato',
    description: 'O contato deu permissão explícita para uso dos seus dados.',
    badgeClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  LEGITIMATE_INTEREST: {
    label: 'Interesse legítimo',
    description: 'Existe uma razão comercial válida sem precisar de autorização formal.',
    badgeClassName: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  CONTRACT: {
    label: 'Relação contratual',
    description: 'Há um contrato ativo entre as partes.',
    badgeClassName: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  },
  LEGAL_OBLIGATION: {
    label: 'Obrigação legal',
    description: 'O uso dos dados é exigido por lei.',
    badgeClassName: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
  },
  VITAL_INTERESTS: {
    label: 'Proteção de vida',
    description: 'Necessário para proteger a vida ou segurança do contato.',
    badgeClassName: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
  },
  PUBLIC_TASK: {
    label: 'Interesse público',
    description: 'Relacionado a uma atividade de interesse público.',
    badgeClassName: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
  },
}

// Derivados do config — retrocompatibilidade com consumidores existentes
export const LEGAL_BASIS_LABELS: Record<LegalBasis, string> = Object.fromEntries(
  Object.entries(LEGAL_BASIS_CONFIG).map(([key, cfg]) => [key, cfg.label]),
) as Record<LegalBasis, string>

export const LEGAL_BASIS_DESCRIPTIONS: Record<LegalBasis, string> = Object.fromEntries(
  Object.entries(LEGAL_BASIS_CONFIG).map(([key, cfg]) => [key, cfg.description]),
) as Record<LegalBasis, string>

export const LEGAL_BASIS_BADGE_CLASS: Record<LegalBasis, string> = Object.fromEntries(
  Object.entries(LEGAL_BASIS_CONFIG).map(([key, cfg]) => [key, cfg.badgeClassName]),
) as Record<LegalBasis, string>

// Array ordenado para uso em selects — mantém ordem consistente em toda a plataforma
export const LEGAL_BASIS_OPTIONS: { value: LegalBasis; label: string; description: string }[] = [
  'CONSENT',
  'LEGITIMATE_INTEREST',
  'CONTRACT',
  'LEGAL_OBLIGATION',
  'VITAL_INTERESTS',
  'PUBLIC_TASK',
].map((value) => ({
  value: value as LegalBasis,
  label: LEGAL_BASIS_CONFIG[value as LegalBasis].label,
  description: LEGAL_BASIS_CONFIG[value as LegalBasis].description,
}))

// ─── Origem da Base Legal ────────────────────────────────────────────────────

export const LEGAL_BASIS_SOURCE_LABELS: Record<LegalBasisSource, string> = {
  MANUAL_CREATION: 'Cadastro manual',
  IMPORT: 'Importação de planilha',
  EMBED_FORM: 'Formulário de captura',
  WHATSAPP_INBOUND: 'WhatsApp (mensagem recebida)',
  API: 'Integração / API',
  ADMIN_UPDATE: 'Atualização pelo administrador',
}

// ─── Evento de Consentimento ─────────────────────────────────────────────────

export const CONSENT_EVENT_TYPE_LABELS: Record<ConsentEventType, string> = {
  GRANTED: 'Autorização registrada',
  WITHDRAWN: 'Saída solicitada',
  UPDATED: 'Base legal atualizada',
  EXPIRED: 'Autorização expirada',
}

// ─── DSR (Solicitações de Direitos) ─────────────────────────────────────────

export const DSR_TYPE_LABELS: Record<DsrRequestType, string> = {
  ACCESS: 'Acesso aos dados',
  ERASURE: 'Exclusão dos dados',
  PORTABILITY: 'Portabilidade',
  RECTIFICATION: 'Retificação',
  OBJECTION: 'Oposição ao tratamento',
}

export const DSR_STATUS_CONFIG: Record<DsrRequestStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  IN_PROGRESS: { label: 'Em andamento', className: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  COMPLETED: { label: 'Concluído', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  REJECTED: { label: 'Rejeitado', className: 'border-red-500/30 bg-red-500/10 text-red-400' },
}
