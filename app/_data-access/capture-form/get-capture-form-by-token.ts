import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { CaptureFields } from '@/_lib/capture-form/field-config'

export interface PublicCaptureFormDto {
  id: string
  organizationId: string
  fields: CaptureFields
  buttonLabel: string
  successMessage: string
  redirectUrl: string | null
  captureSourceId: string
  assignedTo: string | null
  isActive: boolean
  organizationIsReadOnly: boolean
}

export const getCaptureFormByToken = async (token: string): Promise<PublicCaptureFormDto | null> => {
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
        buttonLabel: form.buttonLabel,
        successMessage: form.successMessage,
        redirectUrl: form.redirectUrl,
        captureSourceId: form.captureSourceId,
        assignedTo: form.assignedTo,
        isActive: form.isActive,
        organizationIsReadOnly: form.organization.isReadOnly,
      }
    },
    [`capture-form-token-${token}`],
    { tags: [`capture-form-token:${token}`], revalidate: 60 },
  )

  return getCached()
}
