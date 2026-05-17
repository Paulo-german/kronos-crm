import { revalidateTag } from 'next/cache'

export function revalidateCopilotCache(orgId: string): void {
  revalidateTag(`copilot:${orgId}`)
  revalidateTag(`contacts:${orgId}`)
  revalidateTag(`dashboard:${orgId}`)
}
