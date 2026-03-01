'use client'

import { Inbox } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'

export function EmptyInbox() {
  return (
    <div className="flex h-full flex-1 items-center justify-center bg-background p-6">
      <Card className="max-w-md border-border/50 bg-secondary/20">
        <CardHeader className="items-center pb-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Nenhuma conversa ainda</CardTitle>
          <CardDescription>
            Quando seus agentes de IA começarem a conversar com clientes via
            WhatsApp, as conversas aparecerão aqui.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
