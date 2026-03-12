import { logger } from '@trigger.dev/sdk/v3'

const FALLBACK_PATHS = [
  '/org/[orgSlug]/appointments',
  '/org/[orgSlug]/tasks',
  '/org/[orgSlug]/deals/pipeline',
  '/org/[orgSlug]/deals/list',
  '/org/[orgSlug]/contacts',
]

async function triggerPathFallback(url: string, headers: Record<string, string>): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths: FALLBACK_PATHS }),
    })
  } catch {
    logger.warn('Path fallback revalidation also failed')
  }
}

export async function revalidateTags(tags: string[]): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  const secret = process.env.INTERNAL_API_SECRET

  if (!appUrl || !secret) {
    logger.warn('Skipping tag revalidation: missing NEXT_PUBLIC_APP_URL or INTERNAL_API_SECRET')
    return
  }

  const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`
  const url = `${baseUrl}/api/inbox/revalidate`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tags }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.warn('Tag revalidation failed, triggering path fallback', {
        status: response.status,
        body: text,
      })
      await triggerPathFallback(url, headers)
    }
  } catch (error) {
    logger.warn('Tag revalidation failed (network), triggering path fallback', { tags, error })
    await triggerPathFallback(url, headers)
  }
}
