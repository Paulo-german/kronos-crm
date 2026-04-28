import type { Metadata } from 'next'
import { db } from '@/_lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'

export const metadata: Metadata = {
  title: 'Status da Solicitação de Exclusão | Kronos CRM',
  description: 'Consulte o status da sua solicitação de exclusão de dados.',
}

// Cores de Badge por status de exclusão
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  RECEIVED: 'secondary',
  PROCESSED: 'default',
  FAILED: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Recebida',
  PROCESSED: 'Processada',
  FAILED: 'Falhou',
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface DataDeletionStatusPageProps {
  searchParams: Promise<{ code?: string }>
}

const DataDeletionStatusPage = async ({ searchParams }: DataDeletionStatusPageProps) => {
  const { code } = await searchParams

  if (!code) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Código não informado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nenhum código de confirmação foi fornecido na URL. Verifique o link recebido e tente
              novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const record = await db.metaDataDeletionRequest.findUnique({
    where: { confirmationCode: code },
  })

  if (!record) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solicitação não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Não encontramos nenhuma solicitação de exclusão para o código{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{code}</code>.
              Verifique se o código está correto.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusVariant = STATUS_VARIANTS[record.status] ?? 'secondary'
  const statusLabel = STATUS_LABELS[record.status] ?? record.status

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status da solicitação de exclusão de dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Código de confirmação */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Código de confirmação
            </p>
            <code className="block rounded bg-muted px-3 py-2 text-sm font-mono text-foreground">
              {record.confirmationCode}
            </code>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          {/* Data de recebimento */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recebida em
            </p>
            <p className="text-sm text-foreground">{formatDate(record.receivedAt)}</p>
          </div>

          {/* Data de processamento — exibida apenas quando preenchida */}
          {record.processedAt && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Processada em
              </p>
              <p className="text-sm text-foreground">{formatDate(record.processedAt)}</p>
            </div>
          )}

          {/* Texto explicativo */}
          <p className="rounded-md border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Sua solicitação foi recebida. Os dados associados à sua conta serão removidos em até 30
            dias.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default DataDeletionStatusPage
