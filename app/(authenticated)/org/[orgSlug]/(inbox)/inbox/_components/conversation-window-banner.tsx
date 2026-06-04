'use client'

import { AlertTriangle, Clock, FileText } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import type { ConversationWindowState } from '../_hooks/use-conversation-window'

interface ConversationWindowBannerProps {
  windowState: ConversationWindowState
  onOpenTemplateDialog: () => void
}

/**
 * Banner contextual acima do chat-input que indica o estado da janela de conversa WhatsApp.
 * Somente renderizado para inboxes META_CLOUD quando a janela está fechada ou expirando.
 */
export function ConversationWindowBanner({
  windowState,
  onOpenTemplateDialog,
}: ConversationWindowBannerProps) {
  // Sem banner: não-Meta ou janela aberta com mais de 1h
  if (!windowState.isMetaCloud) return null
  if (windowState.isOpen && !windowState.isExpiring) return null

  // Janela fechada
  if (!windowState.isOpen) {
    return (
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Janela de conversa expirada
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
            Envie um template aprovado para retomar o contato com este cliente.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
          onClick={onOpenTemplateDialog}
        >
          <FileText className="mr-2 h-3.5 w-3.5" />
          Enviar template
        </Button>
      </div>
    )
  }

  // Janela expirando (< 1h restante) — usa formattedTimeRemaining do hook
  return (
    <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2">
      <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
      <p className="text-xs text-amber-700 dark:text-amber-300">
        Janela de conversa expira em{' '}
        <span className="font-medium">{windowState.formattedTimeRemaining}</span>
      </p>
    </div>
  )
}
