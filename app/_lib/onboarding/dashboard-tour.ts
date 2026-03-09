import type { DriveStep } from 'driver.js'

export const DASHBOARD_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="dashboard"]',
    popover: {
      title: 'Dashboard',
      description:
        'Aqui você acompanha os principais indicadores do seu negócio em tempo real.',
    },
  },
  {
    element: '[data-tour="contacts"]',
    popover: {
      title: 'Contatos',
      description:
        'Gerencie todos os seus contatos e leads em um só lugar.',
    },
  },
  {
    element: '[data-tour="deals"]',
    popover: {
      title: 'Negociações',
      description:
        'Acompanhe suas negociações no pipeline visual e mova os deals entre as etapas.',
    },
  },
  {
    element: '[data-tour="inbox"]',
    popover: {
      title: 'Conversas',
      description:
        'Veja todas as conversas do WhatsApp e responda seus clientes diretamente.',
    },
  },
  {
    element: '[data-tour="ai-agent"]',
    popover: {
      title: 'Agentes IA',
      description:
        'Configure agentes de IA para atender seus clientes automaticamente via WhatsApp.',
    },
  },
  {
    element: '[data-tour="settings"]',
    popover: {
      title: 'Configurações',
      description:
        'Ajuste as configurações da sua organização, plano, equipe e integrações.',
    },
  },
]
