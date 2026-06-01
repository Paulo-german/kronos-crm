import { z } from 'zod'

export const removeEmailBlocklistSchema = z.object({
  id: z.string().uuid(),
})
