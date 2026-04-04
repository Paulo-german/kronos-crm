'use client'

import { FileImage, FileVideo, FileText } from 'lucide-react'
import type { MetaTemplate, MetaTemplateHeaderFormat } from '@/_lib/meta/types'

interface TemplatePreviewProps {
  /** Template completo da API do Meta */
  template?: MetaTemplate
  /** Ou campos individuais para preview em tempo real no form */
  headerFormat?: MetaTemplateHeaderFormat
  headerText?: string
  bodyText?: string
  footerText?: string
  /** Valores preenchidos para substituir variáveis {{N}} */
  bodyVariableValues?: string[]
  headerVariableValues?: string[]
}

/** Substitui variáveis {{N}} pelo valor real ou placeholder */
function renderVariables(text: string, values: string[], placeholderPrefix: string): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_match, indexStr: string) => {
    const index = parseInt(indexStr, 10) - 1
    const value = values[index]
    if (value && value.trim()) return value
    return `{{${placeholderPrefix}_${indexStr}}}`
  })
}

const HEADER_FORMAT_ICONS: Record<Exclude<MetaTemplateHeaderFormat, 'TEXT'>, React.FC<{ className?: string }>> = {
  IMAGE: FileImage,
  VIDEO: FileVideo,
  DOCUMENT: FileText,
}

const HEADER_FORMAT_LABELS: Record<Exclude<MetaTemplateHeaderFormat, 'TEXT'>, string> = {
  IMAGE: 'Imagem',
  VIDEO: 'Vídeo',
  DOCUMENT: 'Documento',
}

export function TemplatePreview({
  template,
  headerFormat,
  headerText,
  bodyText,
  footerText,
  bodyVariableValues = [],
  headerVariableValues = [],
}: TemplatePreviewProps) {
  // Derivar conteúdo do template ou dos campos individuais
  const resolvedHeaderFormat: MetaTemplateHeaderFormat | undefined = template
    ? (template.components.find((c) => c.type === 'HEADER')?.format as MetaTemplateHeaderFormat | undefined)
    : headerFormat

  const resolvedHeaderText: string | undefined = template
    ? template.components.find((c) => c.type === 'HEADER')?.text
    : headerText

  const resolvedBodyText: string | undefined = template
    ? template.components.find((c) => c.type === 'BODY')?.text
    : bodyText

  const resolvedFooterText: string | undefined = template
    ? template.components.find((c) => c.type === 'FOOTER')?.text
    : footerText

  const hasContent = resolvedBodyText || resolvedHeaderText || resolvedHeaderFormat || resolvedFooterText

  if (!hasContent) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Preencha o corpo do template para ver o preview
        </p>
      </div>
    )
  }

  return (
    /* Fundo estilo WhatsApp com padrão sutil */
    <div
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        background: 'linear-gradient(135deg, #e5ddd5 0%, #dcd5cc 100%)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='rgba(0,0,0,0.03)' stroke-width='1'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Bubble estilo WhatsApp */}
      <div className="relative ml-auto max-w-[85%]">
        <div
          className="relative rounded-2xl rounded-tr-sm px-3 pb-2 pt-2.5 shadow-sm"
          style={{ backgroundColor: '#dcf8c6' }}
        >
          {/* Header */}
          {resolvedHeaderFormat && resolvedHeaderFormat !== 'TEXT' && (
            <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-black/8">
              {(() => {
                const Icon = HEADER_FORMAT_ICONS[resolvedHeaderFormat]
                return (
                  <>
                    <Icon className="mr-2 h-6 w-6 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      {HEADER_FORMAT_LABELS[resolvedHeaderFormat]}
                    </span>
                  </>
                )
              })()}
            </div>
          )}

          {resolvedHeaderFormat === 'TEXT' && resolvedHeaderText && (
            <p className="mb-1.5 text-sm font-bold text-gray-800">
              {renderVariables(resolvedHeaderText, headerVariableValues, 'header')}
            </p>
          )}

          {/* Body */}
          {resolvedBodyText && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {renderVariables(resolvedBodyText, bodyVariableValues, 'var')}
            </p>
          )}

          {/* Footer */}
          {resolvedFooterText && (
            <p className="mt-1.5 text-xs text-gray-500">{resolvedFooterText}</p>
          )}

          {/* Timestamp decorativo */}
          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[10px] text-gray-500">agora</span>
            <svg
              viewBox="0 0 12 11"
              height="11"
              width="16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#53bdeb]"
            >
              <path
                d="M11.1549 0.652832C11.0745 0.572568 10.9729 0.521014 10.8638 0.505578L10.8638 0.505578C10.6454 0.473403 10.4337 0.583823 10.323 0.789155L5.88666 8.41162L1.93454 5.7236C1.79263 5.62968 1.61593 5.61119 1.45794 5.67359C1.29997 5.73599 1.1816 5.86718 1.13987 6.02925C1.09815 6.19131 1.13775 6.36399 1.24534 6.49347L5.82832 10.7018C5.91236 10.7812 6.02272 10.8239 6.13718 10.8212C6.25165 10.8185 6.35985 10.7706 6.44013 10.6875L11.1549 2.02317C11.2657 1.81682 11.2413 1.56431 11.0962 1.38162C11.119 1.27797 11.1079 1.17249 11.0648 1.07856C11.0217 0.984636 10.9487 0.908397 10.8566 0.861817C10.7645 0.815237 10.658 0.800638 10.5561 0.820156C10.4542 0.839674 10.3629 0.892197 10.2967 0.970222L5.43456 8.64699L1.48244 5.97279C1.40046 5.92004 1.3079 5.89376 1.21536 5.89609L1.21535 5.89609C1.12282 5.89841 1.03161 5.92921 0.952015 5.98514C0.87242 6.04107 0.807462 6.12004 0.765215 6.21353C0.722968 6.30702 0.705209 6.41134 0.713716 6.51548C0.722222 6.61963 0.757224 6.71947 0.815131 6.80493L5.39811 11.0133C5.4818 11.0921 5.59168 11.1348 5.70583 11.1326C5.81997 11.1304 5.92834 11.0834 6.00994 11.0012L11.1549 2.02317C11.3229 1.74695 11.2677 1.39283 11.0258 1.18208C10.9978 1.15869 10.9674 1.13893 10.9352 1.12314L10.9352 1.12314C10.9272 1.11933 10.9192 1.11567 10.9112 1.11215C10.7837 1.05548 10.6408 1.04847 10.5094 1.09218C10.378 1.13589 10.2669 1.22729 10.2 1.34966L10.2 1.34966C10.1672 1.41041 10.1479 1.47742 10.1429 1.54609C10.138 1.61476 10.1476 1.68388 10.171 1.74916L10.171 1.74916C10.2001 1.83008 10.2521 1.90116 10.3213 1.9532L10.3213 1.9532C10.3906 2.00524 10.4742 2.03607 10.5612 2.04174C10.6481 2.04741 10.7352 2.02769 10.8107 1.98494L11.1549 2.02317V0.652832Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Seta do bubble */}
          <div
            className="absolute -right-2 top-0 h-4 w-4 overflow-hidden"
            style={{
              background: 'transparent',
            }}
          >
            <div
              className="absolute right-2 top-0 h-0 w-0"
              style={{
                borderLeft: '8px solid #dcf8c6',
                borderBottom: '8px solid transparent',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
