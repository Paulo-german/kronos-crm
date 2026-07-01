// Catálogo curado de campos de qualificação (source = AGENT). Vivem SÓ no ledger — não
// tocam o CRM (isso é CUSTOM_FIELD, Fase 1c). Cada key ganha semântica pro extrator saber
// o que capturar e o gate (1b) saber o que exigir. MVP: começa pelos campos do nicho da
// Ana (proteção veicular); expandir conforme os agentes. O schema já suportava (agentFieldKey).
export interface AgentFieldSpec {
  label: string
  description: string
}

export const AGENT_FIELD_CATALOG: Record<string, AgentFieldSpec> = {
  name: {
    label: 'Nome do cliente',
    description: 'Primeiro nome ou nome completo do cliente.',
  },
  vehicle: {
    label: 'Veículo',
    description: 'Modelo/marca do veículo a proteger (ex: Honda Civic).',
  },
  version: {
    label: 'Versão do veículo',
    description: 'Versão ou acabamento do veículo (ex: Advanced Hybrid).',
  },
  city: {
    label: 'Cidade',
    description: 'Cidade onde o veículo circula.',
  },
  usage: {
    label: 'Finalidade de uso',
    description:
      'Como o veículo é usado: passeio, aplicativo (Uber/99), entregas, etc.',
  },
}
