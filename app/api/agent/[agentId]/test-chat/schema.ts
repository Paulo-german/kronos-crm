import { z } from 'zod'

// AI SDK v6 UIMessage: content está em `parts`, não mais em `content`
const uiMessagePartSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
  })
  .passthrough()

export const testChatRequestSchema = z
  .object({
    messages: z.array(
      z
        .object({
          role: z.enum(['user', 'assistant']),
          parts: z.array(uiMessagePartSchema).optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough()

/**
 * Extrai texto concatenado das parts de um UIMessage v6.
 */
export function extractTextFromParts(
  parts?: Array<{ type: string; text?: string }>,
): string {
  if (!parts) return ''
  return parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text!)
    .join('')
}
