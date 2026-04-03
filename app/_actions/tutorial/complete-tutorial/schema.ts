import { z } from 'zod'
import { TUTORIAL_IDS } from '@/_lib/tutorials/tutorial-registry'

// TUTORIAL_IDS é exportado do registry — single source of truth
export const completeTutorialSchema = z.object({
  tutorialId: z.enum(TUTORIAL_IDS),
})

export type CompleteTutorialInput = z.infer<typeof completeTutorialSchema>
