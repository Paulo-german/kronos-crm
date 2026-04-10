import { task, logger } from '@trigger.dev/sdk/v3'
import { generateObject } from 'ai'
import { getModel } from '@/_lib/ai/provider'
import { DEFAULT_AGENT_MODEL_ID } from '@/_lib/ai/models'
import { CONFIG_AGENT_PROMPT } from '@/_lib/onboarding/prompts/config-agent'
import { configBundleSchema } from '@/_lib/onboarding/schemas/config-bundle'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'
import type { ConfigBundle } from '@/_lib/onboarding/schemas/config-bundle'

export interface GenerateConfigBundlePayload {
  businessProfile: BusinessProfile
}

export const generateConfigBundle = task({
  id: 'onboarding-generate-config-bundle',
  retry: { maxAttempts: 3 },
  run: async (payload: GenerateConfigBundlePayload): Promise<ConfigBundle> => {
    logger.info('Iniciando geração do config bundle', {
      companyName: payload.businessProfile.companyName,
    })

    const { object } = await generateObject({
      model: getModel(DEFAULT_AGENT_MODEL_ID),
      schema: configBundleSchema,
      system: CONFIG_AGENT_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(payload.businessProfile),
        },
      ],
    })

    logger.info('Config bundle gerado com sucesso', {
      stagesCount: object.pipelineStages.length,
      lostReasonsCount: object.lostReasons.length,
    })

    return object
  },
})
