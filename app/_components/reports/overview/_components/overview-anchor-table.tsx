'use client'

import { formatVariation } from '@/_utils/date-range'
import { formatCurrency } from '@/_utils/format-currency'
import { cn } from '@/_lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import type { ChannelAttributionDto } from '@/_data-access/reports/overview/get-channel-attribution'

interface OverviewAnchorTableProps {
  data: ChannelAttributionDto
  onDrillChannel: (channel: string) => void
}

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  EMAIL: 'E-mail',
  WEBSITE_CHAT: 'Webchat',
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const variation = formatVariation(current, previous)
  return (
    <span
      className={cn(
        'ml-1 inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[10px] font-medium tabular-nums',
        variation.isPositive
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
      )}
    >
      {variation.isPositive ? (
        <TrendingUp className="size-2.5" />
      ) : (
        <TrendingDown className="size-2.5" />
      )}
      {variation.value}
    </span>
  )
}

export function OverviewAnchorTable({ data, onDrillChannel }: OverviewAnchorTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Clientes</TableHead>
            <TableHead className="text-right">Conversão</TableHead>
            <TableHead className="text-right">Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow
              key={row.channel}
              role="button"
              tabIndex={0}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              onClick={() => onDrillChannel(row.channel)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onDrillChannel(row.channel)
                }
              }}
            >
              <TableCell className="font-medium">
                {CHANNEL_LABELS[row.channel] ?? row.channel}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.leadsCount}
                <DeltaBadge current={row.leadsCount} previous={row.prevLeadsCount} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.customersCount}
                <DeltaBadge current={row.customersCount} previous={row.prevCustomersCount} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.conversionRate.toFixed(1)}%
                <DeltaBadge current={row.conversionRate} previous={row.prevConversionRate} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(row.revenue)}
                <DeltaBadge current={row.revenue} previous={row.prevRevenue} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {data.totalLeads}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {data.totalCustomers}
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {data.totalLeads > 0
                ? ((data.totalCustomers / data.totalLeads) * 100).toFixed(1)
                : '0.0'}%
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatCurrency(data.totalRevenue)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
