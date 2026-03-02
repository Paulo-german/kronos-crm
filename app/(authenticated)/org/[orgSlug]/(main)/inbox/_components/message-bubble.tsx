'use client'

import { format } from 'date-fns'
import { cn } from '@/_lib/utils'
import { Bot, FileDown, UserRound } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface MediaMetadata {
  url?: string
  mimetype?: string
  fileName?: string
  seconds?: number
  storedInSupabase?: boolean
}

interface MessageMetadata {
  media?: MediaMetadata
  sentBy?: string
  sentByName?: string
  sentFrom?: string
  [key: string]: unknown
}

interface MessageBubbleProps {
  id: string
  conversationId: string
  role: string
  content: string
  metadata: unknown
  createdAt: Date | string
}

export function MessageBubble({ id, conversationId, role, content, metadata, createdAt }: MessageBubbleProps) {
  const isUser = role === 'user'
  const meta = metadata as MessageMetadata | null
  const media = meta?.media
  const hasAudio = media?.mimetype?.startsWith('audio/') && id && conversationId
  const hasImage = media?.mimetype?.startsWith('image/') && id && conversationId
  const hasDocument =
    media?.mimetype &&
    !media.mimetype.startsWith('audio/') &&
    !media.mimetype.startsWith('image/') &&
    id &&
    conversationId
  const isMediaPlaceholder =
    (hasAudio || hasImage || hasDocument) &&
    /^\[(Áudio \d+s|Imagem[^\]]*|Documento[^\]]*)\]$/.test(content)
  const timestamp = format(new Date(createdAt), 'HH:mm')
  const isFromInbox = meta?.sentFrom === 'inbox'
  const isAiMessage = role === 'assistant' && !!meta?.model

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-start' : 'justify-end',
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2',
          isUser
            ? 'rounded-bl-md bg-secondary/40'
            : 'rounded-br-md bg-primary text-primary-foreground',
        )}
      >
        {/* Mídia */}
        {hasImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/inbox/${conversationId}/media/${id}`}
            alt="Imagem"
            loading="lazy"
            className="mb-2 max-h-64 rounded object-contain"
          />
        )}

        {hasAudio && (
          <audio controls className="mb-1 min-w-[250px]" preload="none">
            <source
              src={`/api/inbox/${conversationId}/media/${id}`}
              type={media!.mimetype}
            />
          </audio>
        )}

        {hasDocument && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className={cn(
              'mb-2 w-full justify-start gap-2 text-xs',
              isUser
                ? 'border-border hover:bg-accent'
                : 'border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground',
            )}
          >
            <a
              href={`/api/inbox/${conversationId}/media/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              download={media?.fileName ?? true}
            >
              <FileDown className="h-4 w-4 shrink-0" />
              <span className="truncate">{media?.fileName ?? 'Documento'}</span>
            </a>
          </Button>
        )}

        {/* Texto — esconde placeholder de áudio quando o player está visível */}
        {!isMediaPlaceholder && (
          <p className={cn(
            'whitespace-pre-wrap text-sm',
            hasAudio && 'italic opacity-80',
          )}>{content}</p>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[10px]',
            isUser ? 'text-muted-foreground' : 'text-primary-foreground/70',
          )}
        >
          <span>{timestamp}</span>
          {isAiMessage && (
            <span className="ml-1 flex items-center gap-0.5 text-primary-foreground/50">
              <Bot className="h-3 w-3" />
              IA
            </span>
          )}
          {isFromInbox && (
            <span className="ml-1 flex items-center gap-0.5 text-primary-foreground/50">
              <UserRound className="h-3 w-3" />
              {meta?.sentByName ?? 'via inbox'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
