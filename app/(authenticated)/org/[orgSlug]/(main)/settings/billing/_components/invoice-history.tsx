'use client'

import { useEffect, useState } from 'react'
import { Loader2, ExternalLink, Download } from 'lucide-react'
import { listInvoices } from '@/_actions/billing/list-invoices'
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

interface Invoice {
  id: string
  number: string | null
  status: string | null
  amountDue: number
  amountPaid: number
  currency: string
  created: number
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
}

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

export function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvoices() {
      const result = await listInvoices({})

      if (result?.data) {
        setInvoices(result.data.invoices)
      } else {
        setError('Não foi possível carregar as faturas.')
      }

      setIsLoading(false)
    }

    fetchInvoices()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {error}
      </div>
    )
  }

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
