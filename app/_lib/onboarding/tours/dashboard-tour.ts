import type { DriveStep } from 'driver.js'

export const DASHBOARD_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="dashboard-kpis"]',
    popover: {
      title: 'Indicadores Principais',
      description:
        'Pipeline, receita, ticket médio e novos leads. Clique em qualquer card pra ver os detalhes.',
    },
  },
  {
    element: '[data-tour="dashboard-charts"]',
    popover: {
      title: 'Gráficos e Análises',
      description:
        'Alterne entre gráfico de receita e funil de vendas pra acompanhar a evolução do seu negócio.',
    },
  },
]
