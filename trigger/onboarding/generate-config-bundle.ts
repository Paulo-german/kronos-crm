import { task, logger } from '@trigger.dev/sdk/v3'
import { generateText, tool, stepCountIs } from 'ai'
import { getModel } from '@/_lib/ai'
import { CONFIG_AGENT_PROMPT } from '@/_lib/onboarding/prompts/config-agent'
import { configBundleSchema } from '@/_lib/onboarding/schemas/config-bundle'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'
import type { ConfigBundle } from '@/_lib/onboarding/schemas/config-bundle'

export interface GenerateConfigBundlePayload {
  businessProfile: BusinessProfile
}

export const generateConfigBundle = task({
  id: 'onboarding-generate-config-bundle',
  retry: { maxAttempts: 2 },
  run: async (payload: GenerateConfigBundlePayload): Promise<ConfigBundle> => {
    logger.info('Iniciando geração do config bundle', {
      companyName: payload.businessProfile.companyName,
    })

    const result = await generateText({
      model: getModel('google/gemini-2.5-pro'),
      system: CONFIG_AGENT_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(payload.businessProfile),
        },
      ],
      tools: {
        generate_config: tool({
          description: 'Gera a configuração base do CRM para o negócio informado',
          inputSchema: configBundleSchema,
        }),
      },
      stopWhen: stepCountIs(1),
    })

    const toolCall = result.steps[0]?.staticToolCalls?.[0]

    if (!toolCall) {
      throw new Error('LLM não chamou a tool generate_config conforme esperado')
    }

    const parsed = configBundleSchema.parse(toolCall.input)

    logger.info('Config bundle gerado com sucesso', {
      stagesCount: parsed.pipelineStages.length,
      lostReasonsCount: parsed.lostReasons.length,
    })

    return parsed
  },
})
