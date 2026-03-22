import type { DriveStep } from 'driver.js'

interface MainTourContext {
  companyName: string
  agentName: string | null
  hasWhatsapp: boolean
  pipelineStages: string[]
}

const LS_CONTEXT_KEY = 'kronos-tour-main-context'

/**
 * Salva o contexto do tour principal no localStorage.
 * Chamado pelo wizard client antes de redirecionar pro dashboard.
 */
export function saveMainTourContext(context: MainTourContext): void {
  localStorage.setItem(LS_CONTEXT_KEY, JSON.stringify(context))
}

/**
 * Le e remove o contexto do localStorage.
 */
export function consumeMainTourContext(): MainTourContext | null {
  const raw = localStorage.getItem(LS_CONTEXT_KEY)
  if (!raw) return null

  localStorage.removeItem(LS_CONTEXT_KEY)

  try {
    return JSON.parse(raw) as MainTourContext
  } catch {
    return null
  }
}

/**
 * Monta os steps do tour principal com textos personalizados.
 */
export function buildMainTourSteps(context: MainTourContext): DriveStep[] {
  const { companyName, agentName, hasWhatsapp, pipelineStages } = context

  const stagesText =
    pipelineStages.length > 0
      ? pipelineStages.join(' → ')
      : 'as etapas do seu funil'

  const steps: DriveStep[] = [
    {
      element: '[data-tour="dashboard"]',
      popover: {
        title: 'Dashboard',
        description: `Aqui você acompanha as métricas da ${companyName} em tempo real — pipeline, receita, novos leads e mais.`,
      },
    },
    {
      element: '[data-tour="contacts"]',
      popover: {
        title: 'Contatos',
        description: `Aqui ficam todos os seus leads e contatos da ${companyName}. Crie manualmente ou importe de uma planilha.`,
      },
    },
    {
      element: '[data-tour="deals"]',
      popover: {
        title: 'Seu Pipeline',
        description: `Seu funil de vendas com as etapas: ${stagesText}. Arraste os deals entre colunas pra mover de etapa!`,
      },
    },
    {
      element: '[data-tour="ai-agent"]',
      popover: {
        title: 'Agente IA',
        description: agentName
          ? `O ${agentName} está configurado e pronto. Adicione documentos na base de conhecimento pra ele atender ainda melhor!`
          : 'Seu agente IA está configurado e pronto. Adicione documentos na base de conhecimento pra ele atender ainda melhor!',
      },
    },
    {
      element: '[data-tour="inbox"]',
      popover: {
        title: 'Conversas',
        description: hasWhatsapp
          ? 'As conversas do WhatsApp aparecem aqui automaticamente. A IA responde, mas você pode assumir a qualquer momento.'
          : 'Conecte o WhatsApp nas configurações pra começar a receber leads e atender automaticamente.',
      },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: 'Configurações',
        description:
          'Ajuste sua equipe, plano, integrações e caixas de entrada.',
      },
    },
    {
      popover: {
        title: hasWhatsapp
          ? 'Tudo configurado! 🚀'
          : 'Quase lá! 🚀',
        description: hasWhatsapp
          ? `A ${companyName} está pronta pra operar! Seus leads já vão cair direto no pipeline.`
          : `A ${companyName} está quase pronta! Conecte o WhatsApp nas configurações pra ativar o atendimento automático.`,
      },
    },
  ]

  return steps
}
