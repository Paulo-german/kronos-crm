'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/_components/ui/form'
import type { PublicCaptureFormDto } from '@/_data-access/capture-form/get-capture-form-by-token'
import { CAPTURE_FIELD_KEYS } from '@/_lib/capture-form/field-config'

interface CaptureFormRendererProps {
  form: PublicCaptureFormDto
  publicToken: string
}

function buildFormSchema(form: PublicCaptureFormDto) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const key of CAPTURE_FIELD_KEYS) {
    const config = form.fields[key]
    if (!config.visible) continue

    const base = key === 'email'
      ? z.string().email('E-mail inválido').max(200)
      : z.string().max(key === 'phone' ? 40 : 200)

    shape[key] = config.required ? base.min(1, 'Campo obrigatório') : base.optional().or(z.literal(''))
  }

  return z.object(shape)
}

export const CaptureFormRenderer = ({ form, publicToken }: CaptureFormRendererProps) => {
  const formRef = useRef<HTMLDivElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Memoizado para evitar reconstrução do schema a cada render
  const schema = useMemo(() => buildFormSchema(form), [form])
  const rhf = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(CAPTURE_FIELD_KEYS.map((key) => [key, ''])),
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

    const res = await fetch('/api/public/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: publicToken, data: values }),
    })

    if (!res.ok) {
      setServerError('Erro ao enviar. Tente novamente.')
      return
    }

    setSubmitted(true)

    if (form.redirectUrl) {
      window.parent.postMessage({ type: 'kronos:redirect', url: form.redirectUrl }, '*')
    }
  }

  if (submitted) {
    return (
      <div ref={formRef} className="flex min-h-[200px] items-center justify-center p-8">
        <p className="text-center text-sm text-muted-foreground">{form.successMessage}</p>
      </div>
    )
  }

  const visibleFields = CAPTURE_FIELD_KEYS.filter((key) => form.fields[key].visible)

  return (
    <div ref={formRef} className="p-6">
      <Form {...rhf}>
        <form onSubmit={rhf.handleSubmit(onSubmit)} className="space-y-4">
          {visibleFields.map((key) => (
            <FormField
              key={key}
              control={rhf.control}
              name={key as keyof z.infer<typeof schema>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.fields[key].label ?? key}
                    {form.fields[key].required && <span className="ml-1 text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                      value={field.value as string ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <Button type="submit" className="w-full" disabled={rhf.formState.isSubmitting}>
            {rhf.formState.isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {form.buttonLabel}
          </Button>
        </form>
      </Form>
    </div>
  )
}
