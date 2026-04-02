'use client'

import { useTransition } from 'react'
import { CheckCircle2, Mail, MailOpen, Pin, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/_components/ui/context-menu'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/_components/ui/dropdown-menu'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'
// Backend worker criará esta action — importamos como se já existisse
import { toggleReadStatus } from '@/_actions/inbox/toggle-read-status'
import { resolveConversation } from '@/_actions/inbox/resolve-conversation'
import { reopenConversation } from '@/_actions/inbox/reopen-conversation'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ConversationMenuItemsProps {
  conversation: ConversationListDto
  onToggleRead: (id: string) => void
  onResolve: (id: string) => void
  onReopen: (id: string) => void
  isPending: boolean
  variant: 'context' | 'dropdown'
}

// ---------------------------------------------------------------------------
// Sub-componente reutilizável de items (usado tanto pelo ContextMenu quanto
// pelo DropdownMenu do botão 3 pontinhos)
// ---------------------------------------------------------------------------

export function ConversationMenuItems({
  conversation,
  onToggleRead,
  onResolve,
  onReopen,
  isPending,
  variant,
}: ConversationMenuItemsProps) {
  const isUnread = conversation.unreadCount > 0
  const label = isUnread ? 'Marcar como lida' : 'Marcar como não lida'
  const Icon = isUnread ? MailOpen : Mail
  const isOpen = conversation.status === 'OPEN'

  if (variant === 'context') {
    return (
      <>
        <ContextMenuItem
          disabled={isPending}
          onClick={() => onToggleRead(conversation.id)}
          className="gap-2"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {isOpen ? (
          <ContextMenuItem
            onClick={() => onResolve(conversation.id)}
            className="gap-2"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resolver conversa
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            onClick={() => onReopen(conversation.id)}
            className="gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reabrir conversa
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem disabled className="gap-2 text-muted-foreground">
          <Pin className="h-3.5 w-3.5" />
          Fixar conversa
          <span className="ml-auto text-[10px] text-muted-foreground/60">
            Em breve
          </span>
        </ContextMenuItem>
      </>
    )
  }

  return (
    <>
      <DropdownMenuItem
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation()
          onToggleRead(conversation.id)
        }}
        className="gap-2"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {isOpen ? (
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation()
            onResolve(conversation.id)
          }}
          className="gap-2"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Resolver conversa
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation()
            onReopen(conversation.id)
          }}
          className="gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reabrir conversa
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        disabled
        className="gap-2 text-muted-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        <Pin className="h-3.5 w-3.5" />
        Fixar conversa
        <span className="ml-auto text-[10px] text-muted-foreground/60">
          Em breve
        </span>
      </DropdownMenuItem>
    </>
  )
}

// ---------------------------------------------------------------------------
// Componente principal: ContextMenu (botão direito)
// ---------------------------------------------------------------------------

interface ConversationContextMenuProps {
  conversation: ConversationListDto
  onToggleRead: (id: string) => void
  onResolve: (id: string) => void
  onReopen: (id: string) => void
  children: React.ReactNode
}

export function ConversationContextMenu({
  conversation,
  onToggleRead,
  onResolve,
  onReopen,
  children,
}: ConversationContextMenuProps) {
  const [isPending, startTransition] = useTransition()

  const handleToggleRead = (conversationId: string) => {
    startTransition(async () => {
      const result = await toggleReadStatus({ conversationId })
      if (result?.serverError) {
        toast.error('Erro ao atualizar status de leitura.')
        return
      }
      onToggleRead(conversationId)
    })
  }

  const handleResolve = (conversationId: string) => {
    startTransition(async () => {
      const result = await resolveConversation({ conversationId })
      if (result?.serverError) {
        toast.error('Erro ao resolver conversa.')
        return
      }
      toast.success('Conversa resolvida.')
      onResolve(conversationId)
    })
  }

  const handleReopen = (conversationId: string) => {
    startTransition(async () => {
      const result = await reopenConversation({ conversationId })
      if (result?.serverError) {
        toast.error('Erro ao reabrir conversa.')
        return
      }
      toast.success('Conversa reaberta.')
      onReopen(conversationId)
    })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ConversationMenuItems
          conversation={conversation}
          onToggleRead={handleToggleRead}
          onResolve={handleResolve}
          onReopen={handleReopen}
          isPending={isPending}
          variant="context"
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}
