import { logger } from '@trigger.dev/sdk/v3'

/**
 * Dispara revalidação do cache de mensagens via API interna.
 * Separado em módulo compartilhado porque tanto `process-agent-message`
 * quanto `transcribe-outbound-media` precisam invalidar após mutações.
 */
export async function revalidateConversationCache(
  conversationId: string,
  organizationId?: string,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  const secret = process.env.INTERNAL_API_SECRET

  if (!appUrl || !secret) {
    logger.warn(
      'Skipping conversation cache revalidation: missing NEXT_PUBLIC_APP_URL or INTERNAL_API_SECRET',
    )
    return
  }

  const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`
  const url = `${baseUrl}/api/inbox/revalidate`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ conversationId, organizationId }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.warn('Conversation cache revalidation returned error', {
        conversationId,
        status: response.status,
        body: text.slice(0, 200),
        url,
      })
      return
    }

    logger.info('Conversation cache revalidated', {
      conversationId,
      status: response.status,
    })
  } catch (error) {
    logger.warn('Conversation cache revalidation failed (network)', {
      conversationId,
      url,
      error,
    })
  }
}
