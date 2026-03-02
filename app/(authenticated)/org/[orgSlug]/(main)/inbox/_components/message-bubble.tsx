'use client'

import { format } from 'date-fns'
import { cn } from '@/_lib/utils'
import { FileDown } from 'lucide-react'
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

function getMediaType(mimetype?: string): 'image' | 'audio' | 'document' | null {
  if (!mimetype) return null
  if (mimetype.startsWith('image/')) return 'image'
  if (mimetype.startsWith('audio/')) return 'audio'
  return 'document'
}

export function MessageBubble({ id, conversationId, role, content, metadata, createdAt }: MessageBubbleProps) {
  const isUser = role === 'user'
  const meta = metadata as MessageMetadata | null
  const media = meta?.media
  const hasStoredMedia = media?.storedInSupabase && media?.url
  const mediaType = hasStoredMedia ? getMediaType(media?.mimetype) : null
  const hasAudio = media?.mimetype?.startsWith('audio/') && id && conversationId
  const isAudioPlaceholder = hasAudio && /^\[Áudio \d+s\]$/.test(content)
  const timestamp = format(new Date(createdAt), 'HH:mm')
  const isFromInbox = meta?.sentFrom === 'inbox'

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
        {hasStoredMedia && mediaType === 'image' && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={media!.url!}
            alt="Imagem"
            className="mb-2 max-h-64 rounded object-contain"
          />
        )}

        {hasAudio && (
          <audio controls className="mb-1 min-w-[250px]" preload="none">
            <source
              src={`/api/inbox/${conversationId}/audio/${id}`}
              type={media!.mimetype}
            />
          </audio>
        )}

        {hasStoredMedia && mediaType === 'document' && (
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
            <a href={media!.url!} target="_blank" rel="noopener noreferrer">
              <FileDown className="h-4 w-4 shrink-0" />
              <span className="truncate">{media!.fileName ?? 'Documento'}</span>
            </a>
          </Button>
        )}

        {/* Texto — esconde placeholder de áudio quando o player está visível */}
        {!isAudioPlaceholder && (
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
          {isFromInbox && (
            <span className={cn(
              'ml-1 italic',
              isUser ? 'text-kronos-purple/70' : 'text-primary-foreground/50',
            )}>{meta?.sentByName ?? 'via inbox'}</span>
          )}
        </div>
      </div>
    </div>
  )
}
