'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ZapIcon, Loader2, BotIcon, AlertTriangleIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/_components/ui/sheet'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import { Badge } from '@/_components/ui/badge'
import { Progress } from '@/_components/ui/progress'
import { testRouter } from '@/_actions/agent-group/test-router'
import type { TestRouterResult } from '@/_actions/agent-group/test-router/schema'

interface TestRouterSheetProps {
  groupId: string
}

export function TestRouterSheet({ groupId }: TestRouterSheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<TestRouterResult | null>(null)

  const { execute, isPending } = useAction(testRouter, {
    onSuccess: ({ data }) => {
      if (data) setResult(data)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao testar o roteamento.')
    },
  })

  const handleOpen = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setMessage('')
      setResult(null)
    }
  }

  const handleTest = () => {
    if (!message.trim()) return
    execute({ groupId, testMessage: message })
  }

  const confidencePercent = result ? Math.round(result.confidence * 100) : 0

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => setIsOpen(true)}
      >
        <ZapIcon className="h-3.5 w-3.5" />
        Testar
      </Button>

      <Sheet open={isOpen} onOpenChange={handleOpen}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 pb-4">
            <SheetTitle>Testar roteamento</SheetTitle>
            <SheetDescription>
              Simule como o router classificaria uma mensagem com a configuração atual.
              Chamada real ao LLM — debita créditos como roteamento de produção.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            <div className="space-y-2">
              <Textarea
                placeholder="Ex: Quero cancelar minha assinatura…"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="resize-none"
                disabled={isPending}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleTest}
                  disabled={!message.trim() || isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ZapIcon className="mr-2 h-3.5 w-3.5" />
                  )}
                  Testar
                </Button>
              </div>
            </div>

            {result ? (
              <div className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BotIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium">{result.workerName}</span>
                    {result.wasFallback && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <AlertTriangleIcon className="h-3 w-3" />
                        Fallback
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                    {confidencePercent}%
                  </span>
                </div>

                <Progress value={confidencePercent} className="h-1.5" />

                <p className="text-xs text-muted-foreground">{result.reasoning}</p>

                {result.creditsCost > 0 && (
                  <p className="text-xs text-muted-foreground/70">
                    {result.creditsCost} crédito{result.creditsCost !== 1 ? 's' : ''} debitado{result.creditsCost !== 1 ? 's' : ''} neste teste.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed">
                <ZapIcon className="h-5 w-5 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Digite uma mensagem acima para simular o roteamento.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
