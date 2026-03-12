'use client'

import { forwardRef, useImperativeHandle, useRef, type KeyboardEvent } from 'react'
import { Loader2, Mic, Send, Square, Trash2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

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
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => ({
      focus() {
        textareaRef.current?.focus()
      },
    }))

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        onSend()
      }
    }

    return (
      <div className="p-4">
        <div className="flex items-end gap-2">
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
              <div className="flex flex-1 items-center gap-3 rounded-md border px-4 py-2">
                <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm tabular-nums text-muted-foreground">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            </>
          ) : (
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              className="max-h-[120px] min-h-[44px] resize-none"
              rows={1}
              disabled={isSendPending || isAudioPending}
            />
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
          ) : text.trim() ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={onSend}
                  disabled={isSendPending}
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
                  disabled={isAudioPending}
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
    )
  },
)
