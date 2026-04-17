'use client'

import { forwardRef, useImperativeHandle, useRef, type KeyboardEvent, type ChangeEvent } from 'react'
import { Loader2, Mic, Paperclip, Send, Square, Trash2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { ACCEPTED_FILE_INPUT } from '@/_lib/whatsapp/media-constants'
import { MediaPreview } from './media-preview'
import { TemplateMessageTrigger } from './template-message-trigger'

export interface ChatInputHandle {
  focus(): void
}

interface ChatInputProps {
  text: string
  onTextChange: (value: string) => void
  onSend: () => void
  isSendPending: boolean
  isAudioPending: boolean
  isRecording: boolean
  recordingDuration: number
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording: () => void
  selectedFile: File | null
  mediaPreviewUrl: string | null
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  onSendMedia: () => void
  isMediaPending: boolean
  /** Somente presente quando o inbox é META_CLOUD */
  onOpenTemplateDialog?: () => void
  /** Quando true, desabilita texto livre (janela Meta expirada) */
  windowClosed?: boolean
  /** Placeholder customizado (ex: modo simulador) */
  placeholder?: string
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(
    {
      text,
      onTextChange,
      onSend,
      isSendPending,
      isAudioPending,
      isRecording,
      recordingDuration,
      onStartRecording,
      onStopRecording,
      onCancelRecording,
      selectedFile,
      mediaPreviewUrl,
      onFileSelect,
      onFileRemove,
      onSendMedia,
      isMediaPending,
      onOpenTemplateDialog,
      windowClosed = false,
      placeholder,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus() {
        textareaRef.current?.focus()
      },
    }))

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        if (selectedFile) {
          onSendMedia()
        } else {
          onSend()
        }
      }
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) onFileSelect(file)
      // Resetar input para permitir selecionar o mesmo arquivo novamente
      event.target.value = ''
    }

    const anyPending = isSendPending || isAudioPending || isMediaPending

    return (
      <div className="p-4">
        <div className={`flex flex-col gap-1 rounded-xl border border-border/50 bg-card p-2 transition-opacity${windowClosed ? ' opacity-60' : ''}`}>
          {selectedFile && (
            <MediaPreview
              file={selectedFile}
              previewUrl={mediaPreviewUrl}
              onRemove={onFileRemove}
            />
          )}
          <div className="flex items-center gap-2">
            {isRecording ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onCancelRecording}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Cancelar gravação</p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex flex-1 items-center gap-3 px-4 py-2">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={anyPending || isRecording || windowClosed}
                      className="shrink-0 text-muted-foreground"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Anexar arquivo</p>
                  </TooltipContent>
                </Tooltip>
                {onOpenTemplateDialog && (
                  <TemplateMessageTrigger
                    onClick={onOpenTemplateDialog}
                    disabled={anyPending}
                  />
                )}
                <Textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(event) => onTextChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    placeholder ??
                    (windowClosed
                      ? 'Janela de 24h expirada. Envie um template para retomar.'
                      : selectedFile
                        ? 'Adicione uma legenda...'
                        : 'Digite uma mensagem...')
                  }
                  className="max-h-[120px] min-h-[44px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  rows={1}
                  disabled={anyPending || windowClosed}
                />
              </>
            )}
            {isRecording ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={onStopRecording}
                    className="shrink-0"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Parar gravação</p>
                </TooltipContent>
              </Tooltip>
            ) : selectedFile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={onSendMedia}
                    disabled={isMediaPending || windowClosed}
                    className="shrink-0"
                  >
                    {isMediaPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Enviar arquivo</p>
                </TooltipContent>
              </Tooltip>
            ) : text.trim() ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={onSend}
                    disabled={isSendPending || windowClosed}
                    className="shrink-0"
                  >
                    {isSendPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Enviar mensagem</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={onStartRecording}
                    disabled={isAudioPending || windowClosed}
                    className="shrink-0"
                  >
                    {isAudioPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Gravar áudio</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_INPUT}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    )
  },
)
