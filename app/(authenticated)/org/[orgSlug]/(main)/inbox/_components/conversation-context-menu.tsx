'use client'

import { useTransition } from 'react'
import { Mail, MailOpen, Pin } from 'lucide-react'
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

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ConversationMenuItemsProps {
  conversation: ConversationListDto
  onToggleRead: (id: string) => void
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
  isPending,
  variant,
}: ConversationMenuItemsProps) {
  const isUnread = conversation.unreadCount > 0
  const label = isUnread ? 'Marcar como lida' : 'Marcar como não lida'
  const Icon = isUnread ? MailOpen : Mail

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
  children: React.ReactNode
}

export function ConversationContextMenu({
  conversation,
  onToggleRead,
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ConversationMenuItems
          conversation={conversation}
          onToggleRead={handleToggleRead}
          isPending={isPending}
          variant="context"
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}
