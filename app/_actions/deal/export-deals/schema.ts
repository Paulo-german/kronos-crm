import { z } from 'zod'

export const exportDealsSchema = z.object({
  search: z.string().default(''),
  status: z
    .array(z.enum(['OPEN', 'IN_PROGRESS', 'WON', 'LOST', 'PAUSED']))
    .default([]),
  priority: z
    .array(z.enum(['low', 'medium', 'high', 'urgent']))
    .default([]),
  assignedTo: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  valueMin: z.number().optional(),
  valueMax: z.number().optional(),
  sort: z
    .enum([
      'created-desc',
      'created-asc',
      'value-desc',
      'value-asc',
      'priority-desc',
      'title-asc',
    ])
    .default('created-desc'),
})

export type ExportDealsInput = z.infer<typeof exportDealsSchema>
