'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { toast } from 'sonner'

interface WebhookUrlDisplayProps {
  token: string
}

export function WebhookUrlDisplay({ token }: WebhookUrlDisplayProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? '')

  const url = `${origin}/api/webhooks/incoming/${token}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('URL copiada para a área de transferência.')
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={url}
        className="text-xs text-kronos-blue bg-kronos-blue/10 border-kronos-blue/30"
        aria-label="URL do webhook"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleCopy}
        aria-label="Copiar URL"
        className="border-kronos-blue/30 bg-kronos-blue/10 text-kronos-blue hover:bg-kronos-blue/20 hover:text-kronos-blue"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}
