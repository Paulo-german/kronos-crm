import { revalidateTag } from 'next/cache'

export function revalidateLifecycleCache(orgId: string, contactId: string): void {
  revalidateTag(`contacts:${orgId}`)
  revalidateTag(`contact:${contactId}`)
  revalidateTag(`dashboard:${orgId}`)
  revalidateTag(`reports:${orgId}`)
}
