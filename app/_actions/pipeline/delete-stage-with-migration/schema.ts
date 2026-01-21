import { z } from 'zod'

export const deleteStageWithMigrationSchema = z.object({
  stageId: z.string().uuid(),
  targetStageId: z.string().uuid(), // Etapa para onde os deals serão movidos
})

export type DeleteStageWithMigrationInput = z.infer<
  typeof deleteStageWithMigrationSchema
>
