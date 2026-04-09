'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, FileText, Loader2, Search, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Badge } from '@/_components/ui/badge'
import { Separator } from '@/_components/ui/separator'
import { Label } from '@/_components/ui/label'
import { cn } from '@/_lib/utils'
import { sendTemplateMessage } from '@/_actions/inbox/send-template-message'
import type { MetaTemplate } from '@/_lib/meta/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extrai índices de variáveis {{N}} de um texto */
function extractVariableIndices(text: string): number[] {
  const matches = text.matchAll(/\{\{(\d+)\}\}/g)
  const indices = new Set<number>()
  for (const match of matches) {
    indices.add(parseInt(match[1], 10))
  }
  return Array.from(indices).sort((a, b) => a - b)
}

/** Substitui variáveis {{N}} pelos valores ou mantém o placeholder */
function renderWithVariables(text: string, values: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_match, indexStr: string) => {
    const index = parseInt(indexStr, 10) - 1
    return values[index]?.trim() ? values[index] : `{{${indexStr}}}`
  })
}

type StatusBadgeClassName = string
const STATUS_CLASSES: Record<string, StatusBadgeClassName> = {
  APPROVED: 'bg-kronos-green/10 text-kronos-green border-kronos-green/20',
  PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplateMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  inboxId: string
  orgSlug: string
  onSent: () => void
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function TemplateMessageDialog({
  open,
  onOpenChange,
  conversationId,
  inboxId,
  orgSlug,
  onSent,
}: TemplateMessageDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null)
  const [bodyValues, setBodyValues] = useState<string[]>([])
  const [headerValues, setHeaderValues] = useState<string[]>([])
  const [templates, setTemplates] = useState<MetaTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const lastFetchedAtRef = useRef<number>(0)

  // Re-busca templates se dados estão stale (> 60s) ou se nunca buscou
  const STALE_AFTER_MS = 60_000

  const loadTemplates = useCallback(async () => {
    const isStale = Date.now() - lastFetchedAtRef.current > STALE_AFTER_MS
    if (templates.length > 0 && !isStale) return

    setIsLoadingTemplates(true)
    try {
      const response = await fetch(`/api/inbox/templates?inboxId=${inboxId}`)
      if (!response.ok) throw new Error('Falha ao carregar templates')
      const data = (await response.json()) as { templates: MetaTemplate[] }
      setTemplates(data.templates)
      lastFetchedAtRef.current = Date.now()
    } catch {
      toast.error('Erro ao carregar templates. Tente novamente.')
    } finally {
      setIsLoadingTemplates(false)
    }
  }, [inboxId, templates.length])

  // Sincronização com sistema externo: carregar templates quando o dialog abre
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset completo ao fechar
      setStep(1)
      setSearch('')
      setSelectedTemplate(null)
      setBodyValues([])
      setHeaderValues([])
    }
    onOpenChange(nextOpen)
  }

  // Filtro de templates por busca — derivação inline, zero useEffect
  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates
    const lower = search.toLowerCase()
    return templates.filter((template) => template.name.toLowerCase().includes(lower))
  }, [templates, search])

  const handleSelectTemplate = (template: MetaTemplate) => {
    setSelectedTemplate(template)
    // Inicializar arrays de valores com strings vazias
    const bodyComp = template.components.find((c) => c.type === 'BODY')
    const headerComp = template.components.find((c) => c.type === 'HEADER')
    const bodyVars = bodyComp?.text ? extractVariableIndices(bodyComp.text) : []
    const headerVars = headerComp?.text ? extractVariableIndices(headerComp.text) : []
    setBodyValues(new Array(Math.max(...bodyVars, 0)).fill(''))
    setHeaderValues(new Array(Math.max(...headerVars, 0)).fill(''))
    setStep(2)
  }

  const { execute: executeSend, isPending: isSending } = useAction(sendTemplateMessage, {
    onSuccess: (result) => {
      if (result.data?.sendFailed) {
        toast.error('Falha no envio do template. Verifique no chat.')
      } else {
        toast.success('Template enviado com sucesso!')
      }
      handleOpenChange(false)
      onSent()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao enviar template.')
    },
  })

  const handleSend = () => {
    if (!selectedTemplate) return

    const headerParams = headerValues
      .filter((value) => value.trim())
      .map((text) => ({ type: 'text' as const, text }))

    const bodyParams = bodyValues
      .filter((value) => value.trim())
      .map((text) => ({ type: 'text' as const, text }))

    executeSend({
      conversationId,
      templateName: selectedTemplate.name,
      language: selectedTemplate.language,
      headerParameters: headerParams.length > 0 ? headerParams : undefined,
      bodyParameters: bodyParams.length > 0 ? bodyParams : undefined,
    })
  }

  // Dados para preview em tempo real — derivação inline
  const previewBodyText = useMemo(() => {
    const bodyComp = selectedTemplate?.components.find((c) => c.type === 'BODY')
    if (!bodyComp?.text) return ''
    return renderWithVariables(bodyComp.text, bodyValues)
  }, [selectedTemplate, bodyValues])

  const previewHeaderText = useMemo(() => {
    const headerComp = selectedTemplate?.components.find(
      (c) => c.type === 'HEADER' && c.format === 'TEXT',
    )
    if (!headerComp?.text) return ''
    return renderWithVariables(headerComp.text, headerValues)
  }, [selectedTemplate, headerValues])

  const footerText = selectedTemplate?.components.find((c) => c.type === 'FOOTER')?.text

  // Variáveis detectadas no template selecionado
  const bodyComponent = selectedTemplate?.components.find((c) => c.type === 'BODY')
  const headerComponent = selectedTemplate?.components.find(
    (c) => c.type === 'HEADER' && c.format === 'TEXT',
  )
  const bodyVariableIndices = useMemo(
    () => (bodyComponent?.text ? extractVariableIndices(bodyComponent.text) : []),
    [bodyComponent],
  )
  const headerVariableIndices = useMemo(
    () => (headerComponent?.text ? extractVariableIndices(headerComponent.text) : []),
    [headerComponent],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === 1 ? 'Selecionar template' : selectedTemplate?.name ?? 'Preencher variáveis'}
              </DialogTitle>
              <DialogDescription>
                {step === 1
                  ? 'Escolha um template aprovado para enviar ao contato'
                  : 'Preencha as variáveis e confirme o envio'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="mt-4" />

        {/* Step 1: Seleção de template */}
        {step === 1 && (
          <>
            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar template..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="mt-3 overflow-y-auto px-6 pb-6" style={{ maxHeight: '50vh' }}>
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  {templates.length === 0 ? (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mt-1 text-sm font-medium">Nenhum template disponível</p>
                      <p className="max-w-[280px] text-xs text-muted-foreground">
                        Crie e aprove templates no Meta para enviar mensagens fora da janela de 24h.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" asChild>
                        <Link
                          href={`/org/${orgSlug}/settings/inboxes/${inboxId}/templates`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="mr-2 h-3.5 w-3.5" />
                          Gerenciar templates
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum template corresponde à busca.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <TemplateSelectItem
                      key={`${template.name}-${template.language}`}
                      template={template}
                      onSelect={handleSelectTemplate}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 2: Preencher variáveis + Preview */}
        {step === 2 && selectedTemplate && (
          <>
            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: '60vh' }}>
              <div className="space-y-5">
                {/* Variáveis do header */}
                {headerVariableIndices.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Variáveis do cabeçalho
                    </p>
                    {headerVariableIndices.map((varIndex) => (
                      <div key={`header-${varIndex}`} className="space-y-1.5">
                        <Label className="text-xs">{`{{${varIndex}}}`}</Label>
                        <Input
                          value={headerValues[varIndex - 1] ?? ''}
                          onChange={(event) => {
                            setHeaderValues((prev) => {
                              const updated = [...prev]
                              updated[varIndex - 1] = event.target.value
                              return updated
                            })
                          }}
                          placeholder={`Valor para {{${varIndex}}}`}
                          className="h-9"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Variáveis do body */}
                {bodyVariableIndices.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Variáveis do corpo
                    </p>
                    {bodyVariableIndices.map((varIndex) => (
                      <div key={`body-${varIndex}`} className="space-y-1.5">
                        <Label className="text-xs">{`{{${varIndex}}}`}</Label>
                        <Input
                          value={bodyValues[varIndex - 1] ?? ''}
                          onChange={(event) => {
                            setBodyValues((prev) => {
                              const updated = [...prev]
                              updated[varIndex - 1] = event.target.value
                              return updated
                            })
                          }}
                          placeholder={`Valor para {{${varIndex}}}`}
                          className="h-9"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview em tempo real */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Preview
                  </p>
                  <WhatsAppPreviewBubble
                    headerText={previewHeaderText}
                    bodyText={previewBodyText}
                    footerText={footerText}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <DialogFooter className="px-6 py-4">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSending}
              >
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar template
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Item de seleção de template
// ---------------------------------------------------------------------------

interface TemplateSelectItemProps {
  template: MetaTemplate
  onSelect: (template: MetaTemplate) => void
}

function TemplateSelectItem({ template, onSelect }: TemplateSelectItemProps) {
  const bodyText = template.components.find((c) => c.type === 'BODY')?.text
  const statusClass = STATUS_CLASSES[template.status] ?? ''

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={cn(
        'w-full rounded-lg border border-border/50 bg-secondary/10 p-3 text-left transition-colors',
        'hover:bg-secondary/30 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        template.status !== 'APPROVED' && 'opacity-50 cursor-not-allowed',
      )}
      disabled={template.status !== 'APPROVED'}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-medium">{template.name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className="h-4 px-1 font-mono text-[10px]">
            {template.language}
          </Badge>
          <Badge
            variant="outline"
            className={`h-4 px-1.5 text-[10px] font-semibold ${statusClass}`}
          >
            {template.status === 'APPROVED' ? (
              <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
            ) : null}
            {template.status === 'APPROVED' ? 'Aprovado' : template.status}
          </Badge>
        </div>
      </div>
      {bodyText && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{bodyText}</p>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Preview bubble estilo WhatsApp (inline no dialog de envio)
// ---------------------------------------------------------------------------

interface WhatsAppPreviewBubbleProps {
  headerText?: string
  bodyText?: string
  footerText?: string
}

function WhatsAppPreviewBubble({ headerText, bodyText, footerText }: WhatsAppPreviewBubbleProps) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: 'linear-gradient(135deg, #e5ddd5 0%, #dcd5cc 100%)' }}
    >
      <div className="ml-auto max-w-[90%]">
        <div
          className="relative rounded-2xl rounded-tr-sm px-3 pb-2 pt-2.5 shadow-sm"
          style={{ backgroundColor: '#dcf8c6' }}
        >
          {headerText && (
            <p className="mb-1.5 text-sm font-bold text-gray-800">{headerText}</p>
          )}
          {bodyText && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{bodyText}</p>
          )}
          {footerText && (
            <p className="mt-1.5 text-xs text-gray-500">{footerText}</p>
          )}
          <div className="mt-1 flex justify-end">
            <span className="text-[10px] text-gray-500">agora</span>
          </div>
        </div>
      </div>
    </div>
  )
}
