import { z } from 'zod'
import { configBundleSchema } from '@/_lib/onboarding/schemas/config-bundle'
import { agentStepBlueprintSchema } from '@/_lib/onboarding/schemas/agent-output'

export const seedOrganizationSchema = z.object({
  agentName: z.string().optional(),
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  generatedBlueprint: z
    .object({
      configBundle: configBundleSchema,
      systemPrompt: z.string().min(1),
      agentSteps: z.array(agentStepBlueprintSchema),
      companyName: z.string().min(1),
      companyDescription: z.string().min(1),
      agentName: z.string().min(1),
    })
    .optional(),
})
