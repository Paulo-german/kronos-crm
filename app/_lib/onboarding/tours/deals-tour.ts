import type { DriveStep } from 'driver.js'

export const DEALS_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="deals-kanban"]',
    popover: {
      title: 'Pipeline Visual',
      description:
        'Este é seu funil de vendas. Cada coluna é uma etapa do processo comercial.',
    },
  },
  {
    element: '[data-tour="deals-card"]',
    popover: {
      title: 'Negociações',
      description:
        'Cada card é uma negociação. Arraste entre colunas pra mover de etapa. Clique pra ver os detalhes.',
    },
  },
  {
    element: '[data-tour="deals-filters"]',
    popover: {
      title: 'Filtros',
      description:
        'Filtre por responsável, período ou status pra encontrar negociações rápido.',
    },
  },
]
