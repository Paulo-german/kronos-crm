'use client'

import { useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import { Alert, AlertDescription } from '@/_components/ui/alert'
import { cn } from '@/_lib/utils'
import { PlatformLogo } from './platform-logo'
import { PROVIDER_SETUP_GUIDES } from '../_lib/provider-setup-guides'
import {
  PLATFORM_LABELS,
  type WebhookPlatform,
} from '../_lib/platform-templates'

interface ProviderSetupGuideProps {
  platform: WebhookPlatform
}

// Guia colapsável de "como configurar na {provedor}". Resiliente por princípio:
// abre fechado, sempre exibe disclaimer de que pode estar desatualizado e
// aponta para a doc oficial (fonte da verdade). Não renderiza para provedores
// sem guia (GENERIC/OTHER).
export function ProviderSetupGuide({ platform }: ProviderSetupGuideProps) {
  const [open, setOpen] = useState(false)
  const guide = PROVIDER_SETUP_GUIDES[platform]
  if (!guide) return null

  const label = PLATFORM_LABELS[platform]

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-md border border-border/50 bg-muted/20"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          Como configurar na {label}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 px-3 pb-3">
        <ol className="space-y-2">
          {guide.steps.map((step, index) => (
            <li key={step} className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground">
                {index + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        {guide.caveat && (
          <p className="text-xs text-muted-foreground">{guide.caveat}</p>
        )}

        <Alert variant="warning" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Este passo a passo pode estar desatualizado — os painéis dos
            provedores mudam com frequência. Confirme os nomes e o caminho na{' '}
            <a
              href={guide.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
            >
              documentação oficial da {label}
              <ExternalLink className="h-3 w-3" />
            </a>
            .
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PlatformLogo platform={platform} size={14} />
          Após configurar, use o detector de campos abaixo para validar o envio.
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
