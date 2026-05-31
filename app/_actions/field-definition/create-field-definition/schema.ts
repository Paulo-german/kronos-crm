import { z } from 'zod'
import { EntityType, FieldType } from '@prisma/client'
import { fieldOptionSchema } from '@/_lib/custom-fields/types'

export const createFieldDefinitionSchema = z
  .object({
    entityType: z.nativeEnum(EntityType),
    label: z.string().trim().min(1, 'Nome do campo é obrigatório'),
    type: z.nativeEnum(FieldType),
    isRequired: z.boolean().default(false),
    options: z.array(fieldOptionSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === FieldType.SELECT && (!data.options || data.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Campos do tipo seleção precisam de ao menos uma opção',
        path: ['options'],
      })
    }
  })

export type CreateFieldDefinitionInput = z.infer<typeof createFieldDefinitionSchema>
