'use client'

import type { CaptureChannel } from '@prisma/client'
import { formatVariation } from '@/_utils/date-range'
import { formatCurrency } from '@/_utils/format-currency'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { CAPTURE_CHANNEL_CONFIG } from '@/_lib/lifecycle/capture-channel-config'
import { VariationBadge } from '@/_components/reports/_components/variation-badge'
import type { ChannelAttributionDto } from '@/_data-access/reports/overview/get-channel-attribution'

interface OverviewAnchorTableProps {
  data: ChannelAttributionDto
  onDrillChannel: (channel: string) => void
}

function channelLabel(channel: string): string {
  return CAPTURE_CHANNEL_CONFIG[channel as CaptureChannel]?.label ?? channel
}

export function OverviewAnchorTable({
  data,
  onDrillChannel,
}: OverviewAnchorTableProps) {
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
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => onDrillChannel(row.channel)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onDrillChannel(row.channel)
                }
              }}
            >
              <TableCell className="font-medium">
                {channelLabel(row.channel)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.leadsCount}
                <VariationBadge
                  size="xs"
                  variation={formatVariation(
                    row.leadsCount,
                    row.prevLeadsCount,
                  )}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.customersCount}
                <VariationBadge
                  size="xs"
                  variation={formatVariation(
                    row.customersCount,
                    row.prevCustomersCount,
                  )}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.conversionRate.toFixed(1)}%
                <VariationBadge
                  size="xs"
                  variation={formatVariation(
                    row.conversionRate,
                    row.prevConversionRate,
                  )}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(row.revenue)}
                <VariationBadge
                  size="xs"
                  variation={formatVariation(row.revenue, row.prevRevenue)}
                />
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
                : '0.0'}
              %
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
