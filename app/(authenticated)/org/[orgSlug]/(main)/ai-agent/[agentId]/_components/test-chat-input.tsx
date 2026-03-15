'use client'

import { useRef, type KeyboardEvent } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import { cn } from '@/_lib/utils'

interface TestChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  disabled?: boolean
}

const TestChatInput = ({
  value,
  onChange,
  onSend,
  isLoading,
  disabled = false,
}: TestChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = value.trim().length > 0 && !isLoading && !disabled

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sozinho envia; Shift+Enter adiciona nova linha
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) {
        onSend()
      }
    }
  }

  const handleSend = () => {
    if (!canSend) return
    onSend()
    textareaRef.current?.focus()
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem... (Enter para enviar)"
          disabled={isLoading || disabled}
          rows={1}
          className={cn(
            'min-h-[40px] flex-1 resize-none overflow-y-auto',
            'text-sm leading-relaxed',
            // Limita altura máxima sem scroll desnecessário
            'max-h-[120px]',
          )}
          aria-label="Campo de mensagem"
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Enviar mensagem"
          className="h-10 w-10 shrink-0"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  )
}

export default TestChatInput
