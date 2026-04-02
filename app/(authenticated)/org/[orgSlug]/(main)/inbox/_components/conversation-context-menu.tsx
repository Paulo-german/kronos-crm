'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Check, CheckCircle2, Mail, MailOpen, Pin, RotateCcw, Settings2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'
import { getLabelColor } from '@/_lib/constants/label-colors'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/_components/ui/context-menu'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/_components/ui/dropdown-menu'
import type { ConversationListDto, ConversationLabelDto } from '@/_data-access/conversation/get-conversations'
import { toggleReadStatus } from '@/_actions/inbox/toggle-read-status'
import { resolveConversation } from '@/_actions/inbox/resolve-conversation'
import { reopenConversation } from '@/_actions/inbox/reopen-conversation'
import { toggleConversationLabel } from '@/_actions/inbox/toggle-conversation-label'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ConversationMenuItemsProps {
  conversation: ConversationListDto
  onToggleRead: (id: string) => void
  onResolve: (id: string) => void
  onReopen: (id: string) => void
  onToggleLabel: (conversationId: string, labelId: string) => void
  availableLabels: ConversationLabelDto[]
  orgSlug: string
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
  onToggleLabel,
  availableLabels,
  orgSlug,
  isPending,
  variant,
}: ConversationMenuItemsProps) {
  const isUnread = conversation.unreadCount > 0
  const label = isUnread ? 'Marcar como lida' : 'Marcar como não lida'
  const Icon = isUnread ? MailOpen : Mail
  const isOpen = conversation.status === 'OPEN'
  const conversationLabelIds = new Set(conversation.labels.map((label) => label.id))

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
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <Tag className="h-3.5 w-3.5" />
            Etiquetas
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {availableLabels.length > 0 ? (
              availableLabels.map((availableLabel) => {
                const colorConfig = getLabelColor(availableLabel.color)
                const isActive = conversationLabelIds.has(availableLabel.id)
                return (
                  <ContextMenuItem
                    key={availableLabel.id}
                    onClick={() => onToggleLabel(conversation.id, availableLabel.id)}
                    className="gap-2"
                  >
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', colorConfig.dot)} />
                    <span className="flex-1 truncate">{availableLabel.name}</span>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                  </ContextMenuItem>
                )
              })
            ) : (
              <>
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  Nenhuma etiqueta criada
                </div>
                <ContextMenuSeparator />
                <ContextMenuItem asChild>
                  <Link href={`/org/${orgSlug}/settings/labels`} className="gap-2">
                    <Settings2 className="h-3.5 w-3.5" />
                    Configurar etiquetas
                  </Link>
                </ContextMenuItem>
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
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
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          className="gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Tag className="h-3.5 w-3.5" />
          Etiquetas
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-48">
          {availableLabels.length > 0 ? (
            availableLabels.map((availableLabel) => {
              const colorConfig = getLabelColor(availableLabel.color)
              const isActive = conversationLabelIds.has(availableLabel.id)
              return (
                <DropdownMenuItem
                  key={availableLabel.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleLabel(conversation.id, availableLabel.id)
                  }}
                  className="gap-2"
                >
                  <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', colorConfig.dot)} />
                  <span className="flex-1 truncate">{availableLabel.name}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              )
            })
          ) : (
            <>
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                Nenhuma etiqueta criada
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild onClick={(event) => event.stopPropagation()}>
                <Link href={`/org/${orgSlug}/settings/labels`} className="gap-2">
                  <Settings2 className="h-3.5 w-3.5" />
                  Configurar etiquetas
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
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
  onToggleLabel: (conversationId: string, labelId: string) => void
  availableLabels: ConversationLabelDto[]
  orgSlug: string
  children: React.ReactNode
}

export function ConversationContextMenu({
  conversation,
  onToggleRead,
  onResolve,
  onReopen,
  onToggleLabel,
  availableLabels,
  orgSlug,
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

  const handleToggleLabel = (conversationId: string, labelId: string) => {
    startTransition(async () => {
      const result = await toggleConversationLabel({ conversationId, labelId })
      if (result?.serverError) {
        toast.error(result.serverError)
        return
      }
      onToggleLabel(conversationId, labelId)
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
          onToggleLabel={handleToggleLabel}
          availableLabels={availableLabels}
          orgSlug={orgSlug}
          isPending={isPending}
          variant="context"
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}
