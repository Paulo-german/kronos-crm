import { task, logger } from '@trigger.dev/sdk/v3'
import { generateObject } from 'ai'
import { getModel } from '@/_lib/ai/provider'
import { DEFAULT_AGENT_MODEL_ID } from '@/_lib/ai/models'
import { STEPS_AGENT_PROMPT } from '@/_lib/onboarding/prompts/steps-agent'
import { agentStepsOutputSchema } from '@/_lib/onboarding/schemas/agent-output'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'
import type { AgentStepsOutput } from '@/_lib/onboarding/schemas/agent-output'

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
  retry: { maxAttempts: 3 },
  run: async (payload: GenerateAgentStepsPayload): Promise<AgentStepsOutput> => {
    logger.info('Iniciando geração das etapas do agente', {
      companyName: payload.businessProfile.companyName,
      stagesCount: payload.stages.length,
    })

    const { object } = await generateObject({
      model: getModel(DEFAULT_AGENT_MODEL_ID),
      schema: agentStepsOutputSchema,
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
    })

    // Validação: targetStagePosition deve referenciar stages reais
    const validPositions = new Set(payload.stages.map((stage) => stage.position))

    for (const step of object.steps) {
      for (const action of step.actions) {
        if (
          action.type === 'move_deal' &&
          action.targetStagePosition != null &&
          !validPositions.has(action.targetStagePosition)
        ) {
          throw new Error(
            `targetStagePosition inválido: ${action.targetStagePosition}. Posições válidas: ${[...validPositions].join(', ')}`,
          )
        }
      }
    }

    logger.info('Etapas do agente geradas com sucesso', {
      stepsCount: object.steps.length,
    })

    return object
  },
})
