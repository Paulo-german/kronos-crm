import { z } from 'zod'

// z.instanceof(File) falha após serialização do React Server Actions —
// o objeto chega no server sem o prototype original. Validamos pela interface.
const fileSchema = z.custom<File>(
  (val): val is File => {
    const isValid =
      typeof val === 'object' &&
      val !== null &&
      typeof (val as File).arrayBuffer === 'function' &&
      typeof (val as File).name === 'string' &&
      typeof (val as File).size === 'number' &&
      typeof (val as File).type === 'string'

    if (!isValid) {
      console.error('[upload-product-media] Schema: file validation failed', {
        type: typeof val,
        isNull: val === null,
        constructor: val?.constructor?.name,
        keys: val && typeof val === 'object' ? Object.keys(val) : [],
        hasArrayBuffer: typeof (val as File)?.arrayBuffer,
        hasName: typeof (val as File)?.name,
        hasSize: typeof (val as File)?.size,
        hasType: typeof (val as File)?.type,
      })
    }

    return isValid
  },
  'Arquivo inválido.',
)

export const uploadProductMediaSchema = z.object({
  productId: z.string().uuid(),
  file: fileSchema.refine((file) => file.size > 0, 'Arquivo vazio.'),
})
