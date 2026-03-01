'use client'

import Link from 'next/link'
import { Inbox, Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'

interface EmptyInboxProps {
  orgSlug: string
  hasNoInbox?: boolean
}

export function EmptyInbox({ orgSlug, hasNoInbox = false }: EmptyInboxProps) {
  return (
    <div className="flex h-full flex-1 items-center justify-center bg-background p-6">
      <Card className="max-w-md border-border/50 bg-secondary/20">
        <CardHeader className="items-center pb-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">
            {hasNoInbox
              ? 'Nenhuma caixa de entrada'
              : 'Nenhuma conversa ainda'}
          </CardTitle>
          <CardDescription>
            {hasNoInbox
              ? 'Crie sua primeira caixa de entrada para começar a receber mensagens via WhatsApp.'
              : 'Quando seus agentes de IA começarem a conversar com clientes via WhatsApp, as conversas aparecerão aqui.'}
          </CardDescription>
        </CardHeader>
        {hasNoInbox && (
          <CardContent className="flex justify-center pb-6">
            <Button asChild>
              <Link href={`/org/${orgSlug}/settings/inboxes`}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Caixa de Entrada
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
