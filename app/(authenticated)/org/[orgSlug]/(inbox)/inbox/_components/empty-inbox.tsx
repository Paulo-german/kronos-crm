'use client'

import Link from 'next/link'
import { Inbox, MessageSquare, Sparkles } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface EmptyInboxProps {
  orgSlug: string
  hasNoInbox?: boolean
}

export function EmptyInbox({ orgSlug, hasNoInbox = false }: EmptyInboxProps) {
  return (
    <div className="flex h-[60vh] flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          {hasNoInbox ? (
            <Inbox className="size-10 text-white" />
          ) : (
            <MessageSquare className="size-10 text-white" />
          )}
        </div>
      </div>

      <div className="max-w-md space-y-2 text-center">
        <h3 className="text-xl font-semibold tracking-tight">
          {hasNoInbox
            ? 'Nenhuma caixa de entrada'
            : 'Nenhuma conversa ainda'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasNoInbox
            ? 'Crie sua primeira caixa de entrada para começar a receber mensagens via WhatsApp.'
            : 'Quando seus agentes de IA começarem a conversar com clientes via WhatsApp, as conversas aparecerão aqui.'}
        </p>
      </div>

      {hasNoInbox && (
        <Button asChild>
          <Link href={`/org/${orgSlug}/settings/inboxes`}>
            <Sparkles className="mr-2 h-4 w-4" />
            Criar Caixa de Entrada
          </Link>
        </Button>
      )}
    </div>
  )
}
