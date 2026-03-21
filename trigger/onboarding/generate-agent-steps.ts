import { task, logger } from '@trigger.dev/sdk/v3'
import { generateText, tool, stepCountIs } from 'ai'
import { getModel } from '@/_lib/ai'
import { STEPS_AGENT_PROMPT } from '@/_lib/onboarding/prompts/steps-agent'
import { agentStepsOutputSchema } from '@/_lib/onboarding/schemas/agent-output'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'
import type { AgentStepsOutput } from '@/_lib/onboarding/schemas/agent-output'

// Tipo mínimo dos stages que o agente precisa para gerar os steps
interface PipelineStageInput {
  name: string
  position: number
  color: string
}

export interface GenerateAgentStepsPayload {
  businessProfile: BusinessProfile
  stages: PipelineStageInput[]
}

export const generateAgentSteps = task({
  id: 'onboarding-generate-agent-steps',
  retry: { maxAttempts: 2 },
  run: async (payload: GenerateAgentStepsPayload): Promise<AgentStepsOutput> => {
    logger.info('Iniciando geração das etapas do agente', {
      companyName: payload.businessProfile.companyName,
      stagesCount: payload.stages.length,
    })

    const result = await generateText({
      model: getModel('google/gemini-2.5-pro'),
      system: STEPS_AGENT_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            businessProfile: payload.businessProfile,
            stages: payload.stages,
          }),
        },
      ],
      tools: {
        generate_steps: tool({
          description: 'Gera as etapas de atendimento do agente de WhatsApp',
          inputSchema: agentStepsOutputSchema,
        }),
      },
      stopWhen: stepCountIs(1),
    })

    const toolCall = result.steps[0]?.staticToolCalls?.[0]

    if (!toolCall) {
      throw new Error('LLM não chamou a tool generate_steps conforme esperado')
    }

    const parsed = agentStepsOutputSchema.parse(toolCall.input)

    // Validação extra: targetStagePosition deve referenciar stages reais
    const validPositions = new Set(payload.stages.map((stage) => stage.position))

    for (const step of parsed.steps) {
      for (const action of step.actions) {
        if (
          action.type === 'move_deal' &&
          !validPositions.has(action.targetStagePosition)
        ) {
          throw new Error(
            `targetStagePosition inválido: ${action.targetStagePosition}. Posições válidas: ${[...validPositions].join(', ')}`,
          )
        }
      }
    }

    logger.info('Etapas do agente geradas com sucesso', {
      stepsCount: parsed.steps.length,
    })

    return parsed
  },
})
