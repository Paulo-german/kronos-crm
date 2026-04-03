import { z } from 'zod'

// z.instanceof(File) falha após serialização do React Server Actions —
// o objeto chega no server sem o prototype original. Validamos pela interface.
const fileSchema = z.custom<File>(
  (val): val is File =>
    typeof val === 'object' &&
    val !== null &&
    typeof (val as File).arrayBuffer === 'function' &&
    typeof (val as File).name === 'string' &&
    typeof (val as File).size === 'number' &&
    typeof (val as File).type === 'string',
  'Arquivo inválido.',
)

export const uploadProductMediaSchema = z.object({
  productId: z.string().uuid(),
  file: fileSchema.refine((file) => file.size > 0, 'Arquivo vazio.'),
})
