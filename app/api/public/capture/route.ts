import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CaptureChannel, LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { getCaptureFormByToken } from '@/_data-access/capture-form/get-capture-form-by-token'
import { resolveCaptureFormAssignee } from '@/_lib/distribution/resolve-capture-form-assignee'
import { CAPTURE_FIELD_KEYS } from '@/_lib/capture-form/field-config'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000

// Rate limit em memória — protege por instância (serverless: sem estado compartilhado entre réplicas)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

const captureSubmissionSchema = z.object({
  token: z.string().uuid(),
  data: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(200).optional().or(z.literal('')),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    role: z.string().trim().max(120).optional().or(z.literal('')),
  }),
  metadata: z
    .object({
      utmSource: z.string().max(200).optional(),
      utmMedium: z.string().max(200).optional(),
      utmCampaign: z.string().max(200).optional(),
      sourceUrl: z.string().url().max(500).optional(),
    })
    .optional(),
})

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) return false
    entry.count++
    return true
  }

  rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  return true
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const parsed = captureSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  const { token, data, metadata } = parsed.data

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`${token}:${ip}`)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const form = await getCaptureFormByToken(token)
  if (!form) return NextResponse.json({ error: 'form_not_found' }, { status: 404 })
  if (!form.isActive) return NextResponse.json({ error: 'form_inactive' }, { status: 403 })
  if (form.organizationIsReadOnly) return NextResponse.json({ error: 'org_unavailable' }, { status: 403 })

  const missingField = CAPTURE_FIELD_KEYS.find(
    (key) => form.fields[key].required && !data[key]?.trim(),
  )
  if (missingField) {
    return NextResponse.json({ error: 'missing_required', field: missingField }, { status: 400 })
  }

  const capturedAt = new Date()

  const assignedTo = await resolveCaptureFormAssignee({
    orgId: form.organizationId,
    formId: form.id,
    distributionUserIds: form.distributionUserIds,
    squadId: form.squadId,
  })

  await db.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: {
        organizationId: form.organizationId,
        assignedTo,
        name: (data.name ?? '').trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        role: data.role?.trim() || null,
        lifecycleStage: LifecycleStage.LEAD,
        firstCaptureChannel: CaptureChannel.EMBED_FORM,
        firstCaptureAt: capturedAt,
        lastCaptureChannel: CaptureChannel.EMBED_FORM,
        lastCaptureAt: capturedAt,
      },
    })

    await tx.contactLifecycleHistory.create({
      data: {
        contactId: contact.id,
        organizationId: form.organizationId,
        fromStage: null,
        toStage: LifecycleStage.LEAD,
        causeType: LifecycleCauseType.CONTACT_CREATED,
        causeRefId: null,
        changedByUserId: null,
      },
    })

    await tx.captureEvent.create({
      data: {
        contactId: contact.id,
        organizationId: form.organizationId,
        channel: CaptureChannel.EMBED_FORM,
        sourceId: form.captureSourceId,
        sourceUrl: metadata?.sourceUrl ?? null,
        utmSource: metadata?.utmSource ?? null,
        utmMedium: metadata?.utmMedium ?? null,
        utmCampaign: metadata?.utmCampaign ?? null,
        capturedAutomatically: true,
        metadata: {},
      },
    })
  })

  revalidateTag(`contacts:${form.organizationId}`)

  return NextResponse.json({ success: true }, { status: 201 })
}
