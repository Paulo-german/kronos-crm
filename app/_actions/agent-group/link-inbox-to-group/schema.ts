import { z } from 'zod'

export const linkInboxToGroupSchema = z.object({
  inboxId: z.string().uuid(),
  agentGroupId: z.string().uuid().nullable(), // null = desvincular
})

export type LinkInboxToGroupInput = z.infer<typeof linkInboxToGroupSchema>
