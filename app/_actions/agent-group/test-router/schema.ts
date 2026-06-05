import { z } from 'zod'

export const testRouterSchema = z.object({
  groupId: z.string().uuid(),
  testMessage: z.string().min(1, 'Digite uma mensagem para testar.').max(2000),
})

export type TestRouterInput = z.infer<typeof testRouterSchema>

export interface TestRouterResult {
  workerName: string
  targetAgentId: string
  confidence: number
  reasoning: string
  wasFallback: boolean
  creditsCost: number
}
