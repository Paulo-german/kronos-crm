'use client'

import { format } from 'date-fns'
import { cn } from '@/_lib/utils'
import { FileDown } from 'lucide-react'

interface MediaMetadata {
  url?: string
  mimetype?: string
  fileName?: string
  storedInSupabase?: boolean
}

interface MessageMetadata {
  media?: MediaMetadata
  sentFrom?: string
  [key: string]: unknown
}

interface MessageBubbleProps {
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

export function MessageBubble({ role, content, metadata, createdAt }: MessageBubbleProps) {
  const isUser = role === 'user'
  const meta = metadata as MessageMetadata | null
  const media = meta?.media
  const hasStoredMedia = media?.storedInSupabase && media?.url
  const mediaType = hasStoredMedia ? getMediaType(media?.mimetype) : null
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

        {hasStoredMedia && mediaType === 'audio' && (
          <audio controls className="mb-2 w-full max-w-xs" preload="none">
            <source src={media!.url!} type={media!.mimetype} />
          </audio>
        )}

        {hasStoredMedia && mediaType === 'document' && (
          <a
            href={media!.url!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'mb-2 flex items-center gap-2 rounded-lg border p-2 text-xs',
              isUser
                ? 'border-border hover:bg-accent'
                : 'border-primary-foreground/20 hover:bg-primary-foreground/10',
            )}
          >
            <FileDown className="h-4 w-4 shrink-0" />
            <span className="truncate">{media!.fileName ?? 'Documento'}</span>
          </a>
        )}

        {/* Texto */}
        <p className="whitespace-pre-wrap text-sm">{content}</p>

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
            )}>via inbox</span>
          )}
        </div>
      </div>
    </div>
  )
}
