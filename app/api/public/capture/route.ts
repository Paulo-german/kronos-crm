import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CaptureChannel, FieldType, LifecycleCauseType, LifecycleStage, Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { getCaptureFormByToken } from '@/_data-access/capture-form/get-capture-form-by-token'
import { resolveCaptureFormAssignee } from '@/_lib/distribution/resolve-capture-form-assignee'
import { CAPTURE_FIELD_KEYS } from '@/_lib/capture-form/field-config'
import { serializeFieldValue } from '@/_lib/custom-fields/serialize'
import { buildSubmissionSnapshot } from '@/_lib/capture-form/custom-fields-config'
import { CUSTOM_FIELD_VALUE_SCHEMA_MAX } from '@/_lib/constants/field-limits'
import { redis } from '@/_lib/redis'
import { createContactPrivacy } from '@/_lib/privacy/create-contact-privacy'
import { CAPTURE_CONSENT_TEXT } from '@/_lib/capture-form/consent-config'

interface ResolvedCustomField {
  fieldDefinitionId: string
  label: string
  type: FieldType
  value: string | null
}

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_SEC = 60

const captureSubmissionSchema = z.object({
  token: z.string().uuid(),
  data: z.object({
    name: z.string().trim().min(1).max(70).optional(),
    email: z.string().trim().email().max(120).optional().or(z.literal('')),
    phone: z.string().trim().max(20).optional().or(z.literal('')),
    role: z.string().trim().max(100).optional().or(z.literal('')),
  }),
  customFields: z
    .array(
      z.object({
        fieldDefinitionId: z.string().uuid(),
        value: z.string().max(CUSTOM_FIELD_VALUE_SCHEMA_MAX).nullable(),
      }),
    )
    .optional(),
  metadata: z
    .object({
      utmSource: z.string().max(200).regex(/^[^<>"'&]*$/, 'Caracteres inválidos').optional(),
      utmMedium: z.string().max(200).regex(/^[^<>"'&]*$/, 'Caracteres inválidos').optional(),
      utmCampaign: z.string().max(200).regex(/^[^<>"'&]*$/, 'Caracteres inválidos').optional(),
      sourceUrl: z.string().url().max(500).optional(),
    })
    .optional(),
  // Honeypot: deve chegar vazio — bots tendem a preencher campos de texto que encontram
  hp: z.string().optional(),
  // Aceite do checkbox de consentimento (quando o form exige consentimento)
  consentAccepted: z.boolean().optional(),
})

async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const redisKey = `rate:capture:${key}`
    // Pipeline garante que INCR e EXPIRE chegam ao Redis atomicamente —
    // evita chave sem TTL caso o processo caia entre os dois comandos
    const results = await redis.pipeline().incr(redisKey).expire(redisKey, RATE_LIMIT_WINDOW_SEC).exec()
    const count = results?.[0]?.[1] as number
    return count <= RATE_LIMIT_MAX
  } catch {
    // Falha no Redis não bloqueia o formulário — degradação graciosa
    return true
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const parsed = captureSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  const { token, data, customFields, metadata, hp, consentAccepted } = parsed.data

  // Honeypot: bot preencheu o campo oculto → silently discard (não revela ao bot que foi bloqueado)
  if (hp?.trim()) {
    return NextResponse.json({ success: true }, { status: 201 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!(await checkRateLimit(`${token}:${ip}`))) {
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

  // Allow-list de campos custom: só os configurados no form e com FieldDefinition ativo.
  // O data-access já filtra os inativos, mas mapeamos por id para validar o input do client.
  const allowedCustomFields = new Map(
    form.customFields.map((field) => [field.fieldDefinitionId, field]),
  )
  const submittedCustomFields = new Map(
    (customFields ?? []).map((field) => [field.fieldDefinitionId, field.value]),
  )

  const resolvedCustomFields: ResolvedCustomField[] = []

  for (const [fieldDefinitionId, configured] of allowedCustomFields) {
    const rawValue = submittedCustomFields.get(fieldDefinitionId) ?? null
    const serialized = serializeFieldValue(
      configured.fieldDefinition.type,
      rawValue,
      configured.fieldDefinition.options,
    )

    if (!serialized.ok) {
      return NextResponse.json(
        { error: 'invalid_custom_field', field: fieldDefinitionId },
        { status: 400 },
      )
    }

    // `required` vem da config do CaptureFormField, não do FieldDefinition
    if (configured.required && serialized.value === null) {
      return NextResponse.json(
        { error: 'missing_required', field: fieldDefinitionId },
        { status: 400 },
      )
    }

    resolvedCustomFields.push({
      fieldDefinitionId,
      label: configured.labelOverride ?? configured.fieldDefinition.label,
      type: configured.fieldDefinition.type,
      value: serialized.value,
    })
  }

  // Validar consentimento antes de qualquer operação no banco
  if (form.consentRequired && !consentAccepted) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 })
  }

  const capturedAt = new Date()

  const assignedTo = await resolveCaptureFormAssignee({
    orgId: form.organizationId,
    formId: form.id,
    distributionUserIds: form.distributionUserIds,
    squadId: form.squadId,
  })

  let createdContactId: string | null = null

  try {
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

    // Base legal derivada do toggle do form (não do canal):
    // consentRequired = CONSENT (ação afirmativa do titular); senão LEGITIMATE_INTEREST.
    await createContactPrivacy(tx, {
      contactId: contact.id,
      legalBasis: form.consentRequired ? 'CONSENT' : 'LEGITIMATE_INTEREST',
      legalBasisSource: 'EMBED_FORM',
      consentText: form.consentRequired ? CAPTURE_CONSENT_TEXT : undefined,
      consentIp: form.consentRequired ? ip : undefined,
      performedBy: null,
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

    const event = await tx.captureEvent.create({
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

    // CustomFieldValue é polimórfico: o vínculo é `entityId` (não `contactId`).
    // createMany em batch — evita N+1 dentro da transação.
    const customFieldValuesToCreate = resolvedCustomFields
      .filter((field) => field.value !== null)
      .map((field) => ({
        entityId: contact.id,
        fieldDefinitionId: field.fieldDefinitionId,
        value: field.value as string,
      }))

    if (customFieldValuesToCreate.length > 0) {
      await tx.customFieldValue.createMany({ data: customFieldValuesToCreate })
    }

    // Snapshot imutável: congela label/value/type no momento do envio (1:1 com o evento)
    const snapshot = buildSubmissionSnapshot({
      systemValues: {
        name: (data.name ?? '').trim(),
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        role: data.role?.trim() || undefined,
      },
      customFields: resolvedCustomFields.map((field) => ({
        fieldId: field.fieldDefinitionId,
        label: field.label,
        type: field.type,
        value: field.value,
      })),
    })

    await tx.captureSubmission.create({
      data: {
        captureFormId: form.id,
        captureEventId: event.id,
        contactId: contact.id,
        // Cast seguro: o snapshot é puramente serializável (string | null),
        // mas a interface com index signature não satisfaz InputJsonValue diretamente
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    })

    createdContactId = contact.id
  })
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }

  revalidateTag(`contacts:${form.organizationId}`)
  if (createdContactId) {
    revalidateTag(`privacy:${createdContactId}`)
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
