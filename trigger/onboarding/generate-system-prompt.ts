import { task, logger } from '@trigger.dev/sdk/v3'
import { generateText, tool, stepCountIs } from 'ai'
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
  retry: { maxAttempts: 2 },
  run: async (
    payload: GenerateSystemPromptPayload,
  ): Promise<{ systemPrompt: string }> => {
    logger.info('Iniciando geração do system prompt', {
      companyName: payload.businessProfile.companyName,
      agentRole: payload.businessProfile.agentRole,
    })

    const result = await generateText({
      model: getModel('google/gemini-2.5-pro'),
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
      tools: {
        generate_prompt: tool({
          description: 'Gera o system prompt do agente de WhatsApp',
          inputSchema: systemPromptOutputSchema,
        }),
      },
      stopWhen: stepCountIs(1),
    })

    const toolCall = result.steps[0]?.staticToolCalls?.[0]

    if (!toolCall) {
      throw new Error('LLM não chamou a tool generate_prompt conforme esperado')
    }

    const parsed = systemPromptOutputSchema.parse(toolCall.input)

    logger.info('System prompt gerado com sucesso', {
      promptLength: parsed.systemPrompt.length,
    })

    return parsed
  },
})
