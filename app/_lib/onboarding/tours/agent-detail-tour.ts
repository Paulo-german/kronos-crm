import type { DriveStep } from 'driver.js'

export const AGENT_DETAIL_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="agent-tabs"]',
    popover: {
      title: 'Configuração do Agente',
      description:
        'Configure seu agente em 4 áreas: identidade geral, processo de atendimento, base de conhecimento e conexão com WhatsApp.',
    },
  },
  {
    element: '[data-tour="agent-knowledge"]',
    popover: {
      title: 'Base de Conhecimento',
      description:
        'Envie documentos, FAQs e catálogos. Quanto mais informação, melhor o agente responde seus clientes.',
    },
  },
  {
    element: '[data-tour="agent-test"]',
    popover: {
      title: 'Testar Agente',
      description:
        'Teste seu agente aqui antes de colocar em produção. Simule conversas reais pra validar o comportamento.',
    },
  },
]
