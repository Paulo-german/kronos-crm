'use client'

import { FileText } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

interface TemplateMessageTriggerProps {
  onClick: () => void
  disabled?: boolean
}

/**
 * Botão que abre o dialog de envio de template message.
 * Somente renderizado quando a conversa pertence a um inbox META_CLOUD.
 */
export function TemplateMessageTrigger({ onClick, disabled = false }: TemplateMessageTriggerProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClick}
          disabled={disabled}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          type="button"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>Enviar template</p>
      </TooltipContent>
    </Tooltip>
  )
}
