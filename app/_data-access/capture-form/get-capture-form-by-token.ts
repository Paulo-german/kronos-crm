import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { CaptureFields } from '@/_lib/capture-form/field-config'
import { type CaptureAppearance, DEFAULT_CAPTURE_APPEARANCE } from '@/_lib/capture-form/appearance-config'
import { parseFieldOptions } from '@/_lib/custom-fields/serialize'
import type { CaptureFormFieldDto } from './get-capture-forms'

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
  consentRequired: boolean
  consentText: string | null
  customFields: CaptureFormFieldDto[]
}

export const getCaptureFormByToken = cache(
  async (token: string): Promise<PublicCaptureFormDto | null> => {
    const getCached = unstable_cache(
      async () => {
        const form = await db.captureForm.findUnique({
          where: { publicToken: token },
          include: {
            organization: { select: { isReadOnly: true } },
            captureFormFields: {
              where: { fieldDefinition: { isActive: true } },
              orderBy: { position: 'asc' },
              include: {
                fieldDefinition: {
                  select: { id: true, label: true, type: true, options: true, isActive: true },
                },
              },
            },
          },
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
          consentRequired: form.consentRequired,
          consentText: form.consentText,
          customFields: form.captureFormFields.map((field) => ({
            fieldDefinitionId: field.fieldDefinitionId,
            required: field.required,
            labelOverride: field.labelOverride,
            position: field.position,
            fieldDefinition: {
              id: field.fieldDefinition.id,
              label: field.fieldDefinition.label,
              type: field.fieldDefinition.type,
              isActive: field.fieldDefinition.isActive,
              options: parseFieldOptions(field.fieldDefinition.options),
            },
          })),
        }
      },
      [`capture-form-token-${token}`],
      { tags: [`capture-form-token:${token}`], revalidate: 60 },
    )

    return getCached()
  },
)
