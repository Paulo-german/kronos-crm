import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { CaptureFields } from '@/_lib/capture-form/field-config'
import { type CaptureAppearance, DEFAULT_CAPTURE_APPEARANCE } from '@/_lib/capture-form/appearance-config'

export interface PublicCaptureFormDto {
  id: string
  organizationId: string
  fields: CaptureFields
  appearance: CaptureAppearance
  buttonLabel: string
  successMessage: string
  redirectUrl: string | null
  captureSourceId: string
  distributionUserIds: string[]
  squadId: string | null
  isActive: boolean
  organizationIsReadOnly: boolean
}

export const getCaptureFormByToken = cache(
  async (token: string): Promise<PublicCaptureFormDto | null> => {
    const getCached = unstable_cache(
      async () => {
        const form = await db.captureForm.findUnique({
          where: { publicToken: token },
          include: { organization: { select: { isReadOnly: true } } },
        })

        if (!form) return null

        return {
          id: form.id,
          organizationId: form.organizationId,
          fields: form.fields as unknown as CaptureFields,
          appearance: { ...DEFAULT_CAPTURE_APPEARANCE, ...(form.appearance as object) } as CaptureAppearance,
          buttonLabel: form.buttonLabel,
          successMessage: form.successMessage,
          redirectUrl: form.redirectUrl,
          captureSourceId: form.captureSourceId,
          distributionUserIds: form.distributionUserIds,
          squadId: form.squadId,
          isActive: form.isActive,
          organizationIsReadOnly: form.organization.isReadOnly,
        }
      },
      [`capture-form-token-${token}`],
      { tags: [`capture-form-token:${token}`], revalidate: 60 },
    )

    return getCached()
  },
)
