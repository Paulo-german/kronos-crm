import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { FieldType } from '@prisma/client'
import { db } from '@/_lib/prisma'
import type { CaptureFields } from '@/_lib/capture-form/field-config'
import { type CaptureAppearance, DEFAULT_CAPTURE_APPEARANCE } from '@/_lib/capture-form/appearance-config'
import { parseFieldOptions } from '@/_lib/custom-fields/serialize'
import type { FieldOption } from '@/_lib/custom-fields/types'

export interface CaptureFormFieldDto {
  fieldDefinitionId: string
  required: boolean
  labelOverride: string | null
  position: number
  fieldDefinition: {
    id: string
    label: string
    type: FieldType
    isActive: boolean
    options: FieldOption[] | null
  }
}

export interface CaptureFormDto {
  id: string
  name: string
  publicToken: string
  fields: CaptureFields
  appearance: CaptureAppearance
  buttonLabel: string
  successMessage: string
  redirectUrl: string | null
  distributionUserIds: string[]
  squadId: string | null
  squadName: string | null
  isActive: boolean
  captureSourceId: string
  submissionCount: number
  customFields: CaptureFormFieldDto[]
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
          captureFormFields: {
            orderBy: { position: 'asc' },
            include: {
              fieldDefinition: {
                select: { id: true, label: true, type: true, options: true, isActive: true },
              },
            },
          },
        },
      })

      return forms.map((form) => ({
        id: form.id,
        name: form.name,
        publicToken: form.publicToken,
        fields: form.fields as unknown as CaptureFields,
        appearance: { ...DEFAULT_CAPTURE_APPEARANCE, ...(form.appearance as object) } as CaptureAppearance,
        buttonLabel: form.buttonLabel,
        successMessage: form.successMessage,
        redirectUrl: form.redirectUrl,
        distributionUserIds: form.distributionUserIds,
        squadId: form.squadId,
        squadName: form.squad?.name ?? null,
        isActive: form.isActive,
        captureSourceId: form.captureSourceId,
        submissionCount: form.captureSource._count.events,
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
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      }))
    },
    [`capture-forms-${orgId}`],
    { tags: [`capture-forms:${orgId}`], revalidate: 3600 },
  )

  return getCached()
})
