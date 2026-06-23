import { z } from 'zod'

export const searchBroadcastContactsSchema = z.object({
  // Vazio = lista inicial paginada (sem filtro de texto)
  query: z.string().max(100).default(''),
  page: z.number().int().min(1).default(1),
})

export type SearchBroadcastContactsInput = z.infer<
  typeof searchBroadcastContactsSchema
>
