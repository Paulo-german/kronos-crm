'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FieldType } from '@prisma/client'
import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/_components/ui/form'
import type { PublicCaptureFormDto } from '@/_data-access/capture-form/get-capture-form-by-token'
import { CAPTURE_FIELD_KEYS } from '@/_lib/capture-form/field-config'
import { CaptureFormView, getVisibleFieldKeys } from '@/_components/capture-form/capture-form-view'
import { CustomFieldInput } from '@/_components/custom-fields/custom-field-input'
import {
  CONTACT_NAME_MAX,
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
  CONTACT_ROLE_MAX,
  CUSTOM_FIELD_VALUE_MAX,
  CUSTOM_FIELD_VALUE_SCHEMA_MAX,
} from '@/_lib/constants/field-limits'

interface CaptureFormRendererProps {
  form: PublicCaptureFormDto
  publicToken: string
}

// Prefixo para campos custom — evita colisão com name/email/phone/role
const CUSTOM_FIELD_PREFIX = 'cf_'

function buildFieldZodType(fieldType: FieldType, required: boolean): z.ZodTypeAny {
  // min(1) vem ANTES dos validadores de formato: Zod aborta na primeira falha,
  // evitando que campos obrigatórios vazios mostrem dois erros simultaneamente
  const str = required ? z.string().min(1, 'Campo obrigatório') : z.string()
  const wrap = (schema: z.ZodTypeAny) => required ? schema : schema.optional().or(z.literal(''))

  switch (fieldType) {
    case FieldType.EMAIL:
      return wrap(str.email('E-mail inválido').max(CUSTOM_FIELD_VALUE_MAX[FieldType.EMAIL] ?? CUSTOM_FIELD_VALUE_SCHEMA_MAX))
    case FieldType.URL:
      return wrap(str.url('URL inválida').max(CUSTOM_FIELD_VALUE_MAX[FieldType.URL] ?? CUSTOM_FIELD_VALUE_SCHEMA_MAX))
    case FieldType.NUMBER:
      return wrap(str.regex(/^-?\d*\.?\d*$/, 'Número inválido').max(CUSTOM_FIELD_VALUE_MAX[FieldType.NUMBER] ?? CUSTOM_FIELD_VALUE_SCHEMA_MAX))
    case FieldType.DATE:
      return wrap(str.regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'))
    default:
      return wrap(str.max(CUSTOM_FIELD_VALUE_MAX[FieldType.TEXT] ?? CUSTOM_FIELD_VALUE_SCHEMA_MAX))
  }
}

function buildFormSchema(form: PublicCaptureFormDto) {
  const shape: Record<string, z.ZodTypeAny> = {}

  // Campos fixos
  for (const key of CAPTURE_FIELD_KEYS) {
    const config = form.fields[key]
    if (!config.visible) continue

    const base =
      key === 'email'
        ? z.string().email('E-mail inválido').max(CONTACT_EMAIL_MAX)
        : key === 'phone'
          ? z.string().max(CONTACT_PHONE_MAX)
          : key === 'role'
            ? z.string().max(CONTACT_ROLE_MAX)
            : z.string().max(CONTACT_NAME_MAX) // name

    shape[key] = config.required ? base.min(1, 'Campo obrigatório') : base.optional().or(z.literal(''))
  }

  // Campos custom
  for (const captureField of form.customFields) {
    const fieldKey = `${CUSTOM_FIELD_PREFIX}${captureField.fieldDefinitionId}`
    shape[fieldKey] = buildFieldZodType(captureField.fieldDefinition.type, captureField.required)
  }

  return z.object(shape)
}

export const CaptureFormRenderer = ({ form, publicToken }: CaptureFormRendererProps) => {
  const formRef = useRef<HTMLDivElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Memoizado para evitar reconstrução do schema e dos defaults a cada render
  const schema = useMemo(() => buildFormSchema(form), [form])

  const defaultValues = useMemo<Record<string, string>>(() => {
    const values: Record<string, string> = Object.fromEntries(
      CAPTURE_FIELD_KEYS.map((key) => [key, '']),
    )
    for (const captureField of form.customFields) {
      values[`${CUSTOM_FIELD_PREFIX}${captureField.fieldDefinitionId}`] = ''
    }
    return values
  }, [form])

  const rhf = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // postMessage auto-height para o iframe pai
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const height = formRef.current?.scrollHeight ?? 0
      window.parent.postMessage({ type: 'kronos:resize', height }, '*')
    })
    if (formRef.current) observer.observe(formRef.current)
    return () => observer.disconnect()
  }, [submitted])

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setServerError(null)

    // Honeypot: bot preencheu o campo oculto → simular sucesso sem enviar
    if (honeypotRef.current?.value) {
      setSubmitted(true)
      return
    }

    // Separar campos fixos dos campos custom
    const systemData: Record<string, string> = {}
    const customFields: Array<{ fieldDefinitionId: string; value: string | null }> = []

    for (const [key, value] of Object.entries(values)) {
      if (key.startsWith(CUSTOM_FIELD_PREFIX)) {
        const fieldDefinitionId = key.slice(CUSTOM_FIELD_PREFIX.length)
        customFields.push({
          fieldDefinitionId,
          value: (value as string) || null,
        })
      } else {
        systemData[key] = (value as string) ?? ''
      }
    }

    const res = await fetch('/api/public/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: publicToken,
        data: systemData,
        customFields,
        hp: honeypotRef.current?.value ?? '',
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null
      const message = body?.error ?? 'Erro ao enviar. Tente novamente.'
      setServerError(message)
      return
    }

    setSubmitted(true)

    if (form.redirectUrl) {
      window.parent.postMessage({ type: 'kronos:redirect', url: form.redirectUrl }, '*')
    }
  }

  if (submitted) {
    return (
      <div
        ref={formRef}
        className="flex min-h-[200px] items-center justify-center p-8"
        style={{ backgroundColor: form.appearance.backgroundColor }}
      >
        <p className="text-center text-sm" style={{ color: form.appearance.primaryColor, opacity: 0.7 }}>
          {form.successMessage}
        </p>
      </div>
    )
  }

  const visibleKeys = getVisibleFieldKeys(form.fields)

  const { primaryColor, borderStyle } = form.appearance
  const fieldRadius = borderStyle === 'square' ? 'rounded-none' : ''

  const submitButton = (
    <Button
      type="submit"
      className={`mt-4 w-full border text-white ${fieldRadius}`}
      style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
      disabled={rhf.formState.isSubmitting}
    >
      {rhf.formState.isSubmitting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : null}
      {form.buttonLabel}
    </Button>
  )

  return (
    <div ref={formRef}>
      <Form {...rhf}>
        <form onSubmit={rhf.handleSubmit(onSubmit)}>
          {/* Honeypot: oculto para humanos via CSS, visível para crawlers */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden opacity-0">
            <label htmlFor="hp_website">Website</label>
            <input
              id="hp_website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="nope"
              ref={honeypotRef}
            />
          </div>

          <CaptureFormView
            appearance={form.appearance}
            fields={form.fields}
            buttonLabel={form.buttonLabel}
            submitButton={submitButton}
          >
            <div className="space-y-4">
              {/* Campos fixos */}
              {visibleKeys.map((key) => (
                <FormField
                  key={key}
                  control={rhf.control}
                  name={key as keyof z.infer<typeof schema>}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel style={{ color: primaryColor }}>
                        {form.fields[key].label ?? key}
                        {form.fields[key].required && (
                          <span className="ml-1 text-xs">*</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                          value={(field.value as string) ?? ''}
                          maxLength={
                            key === 'email' ? CONTACT_EMAIL_MAX
                            : key === 'phone' ? CONTACT_PHONE_MAX
                            : key === 'role' ? CONTACT_ROLE_MAX
                            : CONTACT_NAME_MAX
                          }
                          className={fieldRadius}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              {/* Campos personalizados — ordenados por position (data-access já entrega ordenado) */}
              {form.customFields.map((captureField) => {
                const fieldKey =
                  `${CUSTOM_FIELD_PREFIX}${captureField.fieldDefinitionId}` as keyof z.infer<typeof schema>

                // FieldDefinitionDto esperado pelo CustomFieldInput
                const definition = {
                  id: captureField.fieldDefinition.id,
                  entityType: 'CONTACT' as const,
                  key: captureField.fieldDefinitionId,
                  label: captureField.labelOverride ?? captureField.fieldDefinition.label,
                  type: captureField.fieldDefinition.type,
                  isSystem: false,
                  // O required do form de captura sobrescreve o isRequired da definição
                  isRequired: captureField.required,
                  options: captureField.fieldDefinition.options,
                  position: captureField.position,
                  valueCount: 0,
                }

                return (
                  <CustomFieldInput
                    key={captureField.fieldDefinitionId}
                    definition={definition}
                    control={rhf.control}
                    name={fieldKey}
                  />
                )
              })}

              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </div>
          </CaptureFormView>
        </form>
      </Form>
    </div>
  )
}
