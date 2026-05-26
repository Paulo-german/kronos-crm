'use client'

import { useState, useEffect, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { Scan, Copy, Check, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Badge } from '@/_components/ui/badge'
import { getWebhookTestPayload } from '@/_actions/webhook-source/get-webhook-test-payload'
import { flattenPayload, suggestCrmField, type DetectedField } from '@/_lib/webhooks/flatten-payload'
import { FIELD_MAPPING_KEY_LABELS, type FieldMappingKey } from '../_lib/platform-templates'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

const CRM_KEYS: FieldMappingKey[] = ['name', 'email', 'phone', 'cpf', 'companyName']

interface DetectionRow {
  path: string
  sampleValue: string
  selectedKey: FieldMappingKey | ''
}

interface WebhookFieldDetectorProps {
  webhookSourceId: string
  token: string
  onApply: (mapping: Record<string, string>) => void
}

type DetectorState = 'idle' | 'listening' | 'detected'

export function WebhookFieldDetector({ webhookSourceId, token, onApply }: WebhookFieldDetectorProps) {
  const [state, setState] = useState<DetectorState>('idle')
  const [copied, setCopied] = useState(false)
  const [rows, setRows] = useState<DetectionRow[]>([])
  const pollingStartedAt = useRef<Date | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { execute: fetchPayload } = useAction(getWebhookTestPayload, {
    onSuccess: ({ data }) => {
      if (!data || !pollingStartedAt.current) return
      const receivedAt = data.receivedAt ? new Date(data.receivedAt) : null
      if (!receivedAt || receivedAt <= pollingStartedAt.current) return

      stopPolling()
      const detected: DetectedField[] = flattenPayload(data.payload)
      if (detected.length === 0) {
        toast.warning('Payload recebido, mas nenhum campo primitivo foi encontrado.')
        setState('idle')
        return
      }

      const detectionRows: DetectionRow[] = detected.map((field) => ({
        path: field.path,
        sampleValue: field.sampleValue,
        selectedKey: suggestCrmField(field.path) ?? '',
      }))
      setRows(detectionRows)
      setState('detected')
      toast.success('Campos detectados! Confirme o mapeamento abaixo.')
    },
  })

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = null
    }
    pollingStartedAt.current = null
  }

  function startListening() {
    pollingStartedAt.current = new Date()
    setState('listening')

    pollTimerRef.current = setInterval(() => {
      fetchPayload({ webhookSourceId })
    }, POLL_INTERVAL_MS)

    timeoutTimerRef.current = setTimeout(() => {
      stopPolling()
      setState('idle')
      toast.error('Tempo esgotado. Nenhum payload recebido em 5 minutos.')
    }, POLL_TIMEOUT_MS)
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  const testUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/test/${token}`
      : `/api/webhooks/test/${token}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(testUrl)
    setCopied(true)
    toast.success('URL de teste copiada.')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCancel = () => {
    stopPolling()
    setState('idle')
  }

  const handleRowKeyChange = (index: number, key: FieldMappingKey | '') => {
    setRows((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, selectedKey: key } : row)),
    )
  }

  const handleApply = () => {
    const mapping: Record<string, string> = {}
    for (const row of rows) {
      if (row.selectedKey) {
        mapping[row.selectedKey] = row.path
      }
    }
    if (Object.keys(mapping).length === 0) {
      toast.warning('Nenhum campo foi mapeado.')
      return
    }
    onApply(mapping)
    setState('idle')
    toast.success('Mapeamento aplicado!')
  }

  if (state === 'idle') {
    return (
      <div className="rounded-md border border-border/50 bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Detectar campos automaticamente</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Envie um disparo de teste do seu sistema e o CRM detecta os campos disponíveis.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startListening}
            className="gap-1.5 shrink-0"
          >
            <Scan className="h-3.5 w-3.5" />
            Detectar
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'listening') {
    return (
      <div className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-3">
        <p className="text-sm font-medium">Aguardando payload de teste</p>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            1. Configure essa URL no seu formulário/sistema:
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={testUrl}
              className="font-mono text-xs"
              aria-label="URL de teste"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              aria-label="Copiar URL de teste"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          2. Envie um formulário de teste — os campos serão detectados automaticamente.
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aguardando payload...
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-xs"
          >
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  // state === 'detected'
  const mappedCount = rows.filter((row) => row.selectedKey).length

  return (
    <div className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-sm font-medium">Campos detectados</p>
          <Badge variant="secondary" className="text-xs">
            {rows.length} campos
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setState('idle')}
          className="text-xs"
        >
          Voltar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Selecione qual campo do CRM corresponde a cada valor detectado. Campos sem seleção serão ignorados.
      </p>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.path} className="grid grid-cols-[1fr_auto_10rem] items-center gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs truncate text-foreground">{row.path}</p>
              <p className="text-xs text-muted-foreground truncate">{row.sampleValue}</p>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
            <Select
              value={row.selectedKey || 'none'}
              onValueChange={(value) =>
                handleRowKeyChange(index, value === 'none' ? '' : (value as FieldMappingKey))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="— não mapear —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">— não mapear —</span>
                </SelectItem>
                {CRM_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {FIELD_MAPPING_KEY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          {mappedCount} de {rows.length} campos serão aplicados
        </p>
        <Button
          type="button"
          size="sm"
          onClick={handleApply}
          disabled={mappedCount === 0}
        >
          Aplicar mapeamento
        </Button>
      </div>
    </div>
  )
}
