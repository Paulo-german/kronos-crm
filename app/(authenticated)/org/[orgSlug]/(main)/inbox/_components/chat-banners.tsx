'use client'

import { AlertTriangle, FlaskConical, WifiOff } from 'lucide-react'

interface ChatBannersProps {
  connectionError: boolean
  aiPaused: boolean
  isSimulator?: boolean
}

export function ChatBanners({
  connectionError,
  aiPaused,
  isSimulator,
}: ChatBannersProps) {
  return (
    <>
      {connectionError && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Conexão instável. Verifique sua internet.</span>
        </div>
      )}

      {/* Banner informativo exclusivo para conversas simuladas */}
      {isSimulator && (
        <div className="flex items-center gap-2 border-b border-kronos-cyan bg-cyan-300/10 px-4 py-2 text-xs text-[var(--kronos-cyan)]">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          <span>
            Esta é uma conversa simulada. As mensagens não são enviadas por
            WhatsApp.
          </span>
        </div>
      )}

      {aiPaused && (
        <div className="flex items-center gap-2 border-b border-kronos-yellow/20 bg-kronos-yellow/10 px-4 py-2 text-xs text-kronos-yellow">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            IA pausada. Você está no controle da conversa. Reative manualmente
            pelo switch acima.
          </span>
        </div>
      )}
    </>
  )
}
