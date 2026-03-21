import type { DriveStep } from 'driver.js'

export const CONTACTS_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="contacts-create"]',
    popover: {
      title: 'Criar Contatos',
      description:
        'Crie contatos manualmente ou importe de uma planilha pra começar rápido.',
    },
  },
  {
    element: '[data-tour="contacts-table"]',
    popover: {
      title: 'Sua Base de Contatos',
      description:
        'Todos os seus contatos e leads organizados em tabela. Clique em qualquer um pra ver o detalhe completo.',
    },
  },
]
