'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { cn } from '@/_lib/utils'
import { AlertTriangle, Bot, Check, CheckCheck, FileDown, FileText, Loader2, Pause, Play, RotateCw, UserRound, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { renderWhatsappText } from './whatsapp-text'

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

interface TemplateMetadata {
  name: string
  language: string
  headerParameters?: Array<{ type: string; text: string }>
  bodyParameters?: Array<{ type: string; text: string }>
}

interface DeliveryError {
  code?: number
  title?: string
  message?: string
  userMessage?: string
}

interface MessageMetadata {
  media?: MediaMetadata
  sentBy?: string
  sentByName?: string
  sentFrom?: string
  template?: TemplateMetadata
  deliveryError?: DeliveryError
  [key: string]: unknown
}

// TODO: remove legacy map after 2026-05-08
// Fallback para mensagens salvas no banco antes do deploy do parseProviderError expandido
const LEGACY_META_ERROR_MESSAGES: Record<number, string> = {
  130429: 'Limite de envio atingido. Tente novamente em breve.',
  131009: 'Parâmetro inválido na mensagem.',
  131021: 'O destinatário não pode ser o próprio remetente.',
  131026: 'Número não está no WhatsApp.',
  131031: 'Conta do destinatário bloqueada.',
  131042: 'Pagamento não configurado na conta Meta. Configure um método de pagamento.',
  131045: 'Conta Meta sem elegibilidade para envio.',
  131047: 'Janela de 24h expirada. Envie um template.',
  131048: 'Limite de spam atingido. Aguarde antes de reenviar.',
  131051: 'Tipo de mensagem não suportado.',
  131056: 'Muitas mensagens para o mesmo número. Aguarde.',
  131057: 'Conta em manutenção. Tente novamente mais tarde.',
  132000: 'Quantidade de variáveis não corresponde ao template.',
  132001: 'Template não encontrado.',
  132005: 'Texto do template excede o limite.',
  132012: 'Formato de variável inválido.',
  132015: 'Template pausado pelo Meta.',
  132016: 'Template desativado pelo Meta.',
}

function DeliveryStatusIcon({ status }: { status: string | null }) {
  if (!status) return null

  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3 text-white/50" />
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-white/50" />
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-400" />
    case 'failed':
      return <X className="h-3 w-3 text-red-400" />
    default:
      return null
  }
}

function resolveErrorMessage(metadata: MessageMetadata | null): string {
  const error = metadata?.deliveryError
  if (!error) return 'Falha na entrega'

  // userMessage vem preenchido do backend (parseProviderError)
  if (error.userMessage) return error.userMessage

  // Fallback para mensagens salvas antes do deploy (retrocompatibilidade)
  if (error.code && LEGACY_META_ERROR_MESSAGES[error.code]) {
    return LEGACY_META_ERROR_MESSAGES[error.code]
  }

  return error.title ?? error.message ?? 'Falha na entrega'
}

interface FailedMessageBannerProps {
  metadata: MessageMetadata | null
  onRetry?: () => void
  isRetrying?: boolean
}

function FailedMessageBanner({ metadata, onRetry, isRetrying }: FailedMessageBannerProps) {
  const errorMessage = resolveErrorMessage(metadata)
  const isAudio = metadata?.media?.mimetype?.startsWith('audio/')
  const canRetry = !isAudio && !!onRetry

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-950/50 px-2.5 py-1.5">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-300" />
      <span className="flex-1 text-[11px] leading-tight text-red-200 line-clamp-1">
        {errorMessage}
      </span>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
        >
          {isRetrying ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Reenviando...
            </>
          ) : (
            <>
              <RotateCw className="h-3 w-3" />
              Reenviar
            </>
          )}
        </button>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  id: string
  conversationId: string
  role: string
  content: string
  metadata: unknown
  deliveryStatus: string | null
  createdAt: Date | string
  onRetry?: (messageId: string) => void
  isRetrying?: boolean
}

export function MessageBubble({ id, conversationId, role, content, metadata, deliveryStatus, createdAt, onRetry, isRetrying }: MessageBubbleProps) {
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
  const isTemplateMessage = !!meta?.template

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

        {/* Badge de template message */}
        {isTemplateMessage && (
          <div className="mb-1.5 flex items-center gap-1">
            <Badge
              variant="outline"
              className={cn(
                'h-4 gap-1 px-1.5 text-[10px] font-semibold',
                isUser
                  ? 'border-border/50 text-muted-foreground'
                  : 'border-white/30 text-white/70',
              )}
            >
              <FileText className="h-2.5 w-2.5" />
              Template
            </Badge>
          </div>
        )}

        {/* Texto — esconde placeholder de áudio quando o player está visível */}
        {!isMediaPlaceholder && (
          <p className={cn(
            'whitespace-pre-wrap text-sm',
            hasAudio && 'italic opacity-80',
          )}>{renderWhatsappText(content)}</p>
        )}

        {/* Banner de erro para mensagens falhadas */}
        {!isUser && deliveryStatus === 'failed' && (
          <FailedMessageBanner
            metadata={meta}
            onRetry={onRetry ? () => onRetry(id) : undefined}
            isRetrying={isRetrying}
          />
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[10px]',
            isUser ? 'text-muted-foreground' : 'text-white/70',
          )}
        >
          <span>{timestamp}</span>
          {!isUser && deliveryStatus && (
            <DeliveryStatusIcon status={deliveryStatus} />
          )}
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
