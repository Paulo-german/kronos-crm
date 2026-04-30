import { z } from 'zod'

// Action de refresh não exige input — o orgId é injetado pelo middleware via ctx
export const refreshSubscriptionCacheSchema = z.object({})

export type RefreshSubscriptionCacheInput = z.infer<
  typeof refreshSubscriptionCacheSchema
>
