'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { cn } from '@/_lib/utils'
import { Bot, FileDown, Pause, Play, UserRound } from 'lucide-react'
import { Button } from '@/_components/ui/button'

function formatAudioDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function AudioPlayer({ src, isUser }: { src: string; isUser: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
    }
    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return

    const rect = event.currentTarget.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    audio.currentTime = percent * audio.duration
  }

  return (
    <div
      className={cn(
        'mb-1 flex min-w-[220px] items-center gap-2.5 rounded-lg px-3 py-2',
        isUser ? 'bg-secondary/40' : 'bg-white/10',
      )}
    >
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
          isUser
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'bg-white/20 text-white hover:bg-white/30',
        )}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 translate-x-[1px]" />
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div
          className={cn(
            'h-1 cursor-pointer rounded-full',
            isUser ? 'bg-border' : 'bg-white/20',
          )}
          onClick={handleSeek}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isUser ? 'bg-primary' : 'bg-white/70',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span
        className={cn(
          'text-[10px] tabular-nums',
          isUser ? 'text-muted-foreground' : 'text-white/60',
        )}
      >
        {duration > 0 ? formatAudioDuration(duration) : '0:00'}
      </span>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  )
}

interface MediaMetadata {
  url?: string
  mimetype?: string
  fileName?: string
  seconds?: number
  storedInSupabase?: boolean
  storedExternally?: boolean
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
  const remoteUrl = (media?.storedInSupabase || media?.storedExternally) ? media?.url : undefined
  const mediaSrc = remoteUrl ?? `/api/inbox/${conversationId}/media/${id}`
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
            ? 'rounded-bl-md border border-border/30 bg-secondary/60 shadow-sm'
            : 'rounded-br-md bg-primary text-white shadow-sm',
        )}
      >
        {/* Mídia */}
        {hasImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mediaSrc}
            alt="Imagem"
            loading="lazy"
            className="mb-2 max-h-64 rounded-lg object-contain shadow-sm transition-all hover:ring-2 hover:ring-primary/20"
          />
        )}

        {hasAudio && (
          <AudioPlayer
            src={mediaSrc}
            isUser={isUser}
          />
        )}

        {hasDocument && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className={cn(
              'mb-2 w-full justify-start gap-2 text-xs',
              isUser
                ? 'border-border/50 bg-primary/5 hover:bg-primary/10'
                : 'border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white',
            )}
          >
            <a
              href={mediaSrc}
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
            isUser ? 'text-muted-foreground' : 'text-white/70',
          )}
        >
          <span>{timestamp}</span>
          {isAiMessage && (
            <span className="ml-1 flex items-center gap-0.5 text-white/50">
              <Bot className="h-3 w-3" />
              IA
            </span>
          )}
          {isFromInbox && (
            <span className="ml-1 flex items-center gap-0.5 text-white/50">
              <UserRound className="h-3 w-3" />
              {meta?.sentByName ?? 'via inbox'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
