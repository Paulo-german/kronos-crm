import { logger } from '@trigger.dev/sdk/v3'

export async function revalidateTags(tags: string[]): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  const secret = process.env.INTERNAL_API_SECRET

  if (!appUrl || !secret) {
    logger.warn('Skipping tag revalidation: missing NEXT_PUBLIC_APP_URL or INTERNAL_API_SECRET')
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
      body: JSON.stringify({ tags }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.warn('Tag revalidation failed', { status: response.status, body: text })
    }
  } catch (error) {
    logger.warn('Tag revalidation failed (network)', { tags, error })
  }
}
