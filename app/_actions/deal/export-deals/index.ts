'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getDealsForExport } from '@/_data-access/deal/get-deals-for-export'
import { exportDealsSchema } from './schema'
import type { DealListDto } from '@/_data-access/deal/get-deals'

// BOM UTF-8 garante que o Excel abra o CSV com acentuação correta
const CSV_BOM = '\ufeff'
const CSV_SEPARATOR = ';'

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Novo',
  IN_PROGRESS: 'Em Andamento',
  WON: 'Vendido',
  LOST: 'Perdido',
  PAUSED: 'Pausado',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

/** Formata Date para dd/MM/yyyy. Retorna string vazia se null. */
function formatDate(date: Date | null): string {
  if (!date) return ''
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Escapa um valor para uso em CSV com separador ';'.
 * Envolve com aspas duplas se o valor contiver ponto-e-vírgula ou aspas.
 * Aspas duplas internas são escapadas por duplicação ("" → representa ").
 */
function escapeCsvValue(value: string): string {
  if (!value.includes(CSV_SEPARATOR) && !value.includes('"')) return value
  return `"${value.replace(/"/g, '""')}"`
}

function buildCsvRow(deal: DealListDto): string {
  const columns = [
    escapeCsvValue(deal.title),
    escapeCsvValue(deal.stageName),
    escapeCsvValue(STATUS_LABELS[deal.status] ?? deal.status),
    escapeCsvValue(PRIORITY_LABELS[deal.priority] ?? deal.priority),
    escapeCsvValue(deal.contactName ?? ''),
    escapeCsvValue(deal.companyName ?? ''),
    deal.totalValue.toFixed(2),
    formatDate(deal.expectedCloseDate),
    escapeCsvValue(deal.assigneeName ?? ''),
    formatDate(deal.createdAt),
  ]

  return columns.join(CSV_SEPARATOR)
}

const CSV_HEADER = [
  'Titulo',
  'Etapa',
  'Status',
  'Prioridade',
  'Contato',
  'Empresa',
  'Valor',
  'Fech. Previsto',
  'Responsavel',
  'Data de Criacao',
].join(CSV_SEPARATOR)

export const exportDeals = orgActionClient
  .schema(exportDealsSchema)
  .action(async ({ parsedInput: filters, ctx }) => {
    // Leitura exige permissão base — MEMBER enxerga apenas deals próprios (filtrado no data-access)
    requirePermission(canPerformAction(ctx, 'deal', 'read'))

    const deals = await getDealsForExport(ctx, {
      search: filters.search || undefined,
      status: filters.status.length > 0 ? filters.status : undefined,
      priority: filters.priority.length > 0 ? filters.priority : undefined,
      assignedTo: filters.assignedTo,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      valueMin: filters.valueMin,
      valueMax: filters.valueMax,
      pipelineId: filters.pipelineId,
    })

    const rows = deals.map((deal) => buildCsvRow(deal))
    const csv = [CSV_BOM + CSV_HEADER, ...rows].join('\n')

    return { csv, count: deals.length }
  })
