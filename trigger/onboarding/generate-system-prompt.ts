import { task, logger } from '@trigger.dev/sdk/v3'
import { generateObject } from 'ai'
import { getModel } from '@/_lib/ai'
import { PROMPT_AGENT_PROMPT } from '@/_lib/onboarding/prompts/prompt-agent'
import { systemPromptOutputSchema } from '@/_lib/onboarding/schemas/agent-output'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'
import type { ConfigBundle } from '@/_lib/onboarding/schemas/config-bundle'

export interface GenerateSystemPromptPayload {
  businessProfile: BusinessProfile
  configBundle: ConfigBundle
}

export const generateSystemPrompt = task({
  id: 'onboarding-generate-system-prompt',
  retry: { maxAttempts: 3 },
  run: async (
    payload: GenerateSystemPromptPayload,
  ): Promise<{ systemPrompt: string }> => {
    logger.info('Iniciando geração do system prompt', {
      companyName: payload.businessProfile.companyName,
      agentRole: payload.businessProfile.agentRole,
    })

    const { object } = await generateObject({
      model: getModel('google/gemini-2.5-pro'),
      schema: systemPromptOutputSchema,
      system: PROMPT_AGENT_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            businessProfile: payload.businessProfile,
            configBundle: payload.configBundle,
          }),
        },
      ],
    })

    logger.info('System prompt gerado com sucesso', {
      promptLength: object.systemPrompt.length,
    })

    return object
  },
})
