import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { CaptureFields } from '@/_lib/capture-form/field-config'

export interface CaptureFormDto {
  id: string
  name: string
  publicToken: string
  fields: CaptureFields
  buttonLabel: string
  successMessage: string
  redirectUrl: string | null
  distributionUserIds: string[]
  squadId: string | null
  squadName: string | null
  isActive: boolean
  captureSourceId: string
  submissionCount: number
  createdAt: Date
  updatedAt: Date
}

export const getCaptureFormsByOrg = cache(async (orgId: string): Promise<CaptureFormDto[]> => {
  const getCached = unstable_cache(
    async () => {
      const forms = await db.captureForm.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        include: {
          squad: { select: { name: true } },
          captureSource: { select: { _count: { select: { events: true } } } },
        },
      })

      return forms.map((form) => ({
        id: form.id,
        name: form.name,
        publicToken: form.publicToken,
        fields: form.fields as unknown as CaptureFields,
        buttonLabel: form.buttonLabel,
        successMessage: form.successMessage,
        redirectUrl: form.redirectUrl,
        distributionUserIds: form.distributionUserIds,
        squadId: form.squadId,
        squadName: form.squad?.name ?? null,
        isActive: form.isActive,
        captureSourceId: form.captureSourceId,
        submissionCount: form.captureSource._count.events,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      }))
    },
    [`capture-forms-${orgId}`],
    { tags: [`capture-forms:${orgId}`], revalidate: 3600 },
  )

  return getCached()
})
