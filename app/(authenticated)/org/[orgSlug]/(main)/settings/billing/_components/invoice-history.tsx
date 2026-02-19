'use client'

import { ExternalLink, Download } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import type { InvoiceDto } from '@/_data-access/billing/get-invoices'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'Pago', variant: 'default' },
  open: { label: 'Aberta', variant: 'outline' },
  draft: { label: 'Rascunho', variant: 'secondary' },
  void: { label: 'Cancelada', variant: 'secondary' },
  uncollectible: { label: 'Inadimplente', variant: 'destructive' },
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp * 1000))
}

interface InvoiceHistoryProps {
  invoices: InvoiceDto[]
}

export function InvoiceHistory({ invoices }: InvoiceHistoryProps) {
  if (invoices.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Nenhuma fatura encontrada.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº Fatura</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const statusInfo = STATUS_MAP[invoice.status ?? ''] ?? {
              label: invoice.status ?? '—',
              variant: 'secondary' as const,
            }

            return (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  {invoice.number ?? '—'}
                </TableCell>
                <TableCell>{formatDate(invoice.created)}</TableCell>
                <TableCell>
                  {formatCurrency(invoice.amountDue, invoice.currency)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {invoice.hostedInvoiceUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1 size-4" />
                          Ver
                        </a>
                      </Button>
                    )}
                    {invoice.invoicePdf && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="mr-1 size-4" />
                          PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
