'use client'

import { AlertTriangle, WifiOff } from 'lucide-react'

interface ChatBannersProps {
  connectionError: boolean
  aiPaused: boolean
}

export function ChatBanners({ connectionError, aiPaused }: ChatBannersProps) {
  return (
    <>
      {connectionError && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Conexão instável. Verifique sua internet.</span>
        </div>
      )}

      {aiPaused && (
        <div className="flex items-center gap-2 border-b border-kronos-yellow/20 bg-kronos-yellow/10 px-4 py-2 text-xs text-kronos-yellow">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            IA pausada. Você está no controle da conversa. Reative manualmente pelo switch acima.
          </span>
        </div>
      )}
    </>
  )
}
