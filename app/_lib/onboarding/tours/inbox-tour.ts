import type { DriveStep } from 'driver.js'

export const INBOX_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="inbox-list"]',
    popover: {
      title: 'Conversas',
      description:
        'Suas conversas do WhatsApp aparecem aqui. As não lidas ficam destacadas no topo.',
    },
  },
  {
    element: '[data-tour="inbox-chat"]',
    popover: {
      title: 'Chat ao Vivo',
      description:
        'Clique numa conversa pra ver o histórico. A IA responde automaticamente, mas você pode pausar e assumir a qualquer momento.',
    },
  },
  {
    element: '[data-tour="inbox-manage"]',
    popover: {
      title: 'Gerenciar Caixas',
      description:
        'Gerencie suas caixas de entrada e conecte novos canais de atendimento.',
    },
  },
]
