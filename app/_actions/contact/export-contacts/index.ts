'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import {
  getContactsForExport,
  type ExportContactRow,
} from '@/_data-access/contact/get-contacts-for-export'
import { exportContactsSchema } from './schema'

// BOM UTF-8 garante que o Excel abra o CSV com acentuação correta
const CSV_BOM = '\ufeff'
const CSV_SEPARATOR = ';'

const LIFECYCLE_LABELS: Record<string, string> = {
  COLD: 'Frio',
  LEAD: 'Lead',
  QUALIFIED: 'Qualificado',
  OPPORTUNITY: 'Oportunidade',
  CUSTOMER: 'Cliente',
}

const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  NEVER_BOUGHT: 'Nunca comprou',
  ACTIVE: 'Ativo',
  DORMANT: 'Dormente',
  CHURNED: 'Perdido',
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

function buildCsvRow(contact: ExportContactRow): string {
  const columns = [
    escapeCsvValue(contact.name),
    escapeCsvValue(contact.email ?? ''),
    escapeCsvValue(contact.phone ?? ''),
    escapeCsvValue(contact.companyName ?? ''),
    escapeCsvValue(contact.role ?? ''),
    contact.isDecisionMaker ? 'Sim' : 'Não',
    escapeCsvValue(
      LIFECYCLE_LABELS[contact.lifecycleStage] ?? contact.lifecycleStage,
    ),
    escapeCsvValue(
      CUSTOMER_STATUS_LABELS[contact.customerStatus] ?? contact.customerStatus,
    ),
    contact.healthScore != null ? String(contact.healthScore) : '',
    escapeCsvValue(contact.assigneeName ?? ''),
    formatDate(contact.createdAt),
  ]

  return columns.join(CSV_SEPARATOR)
}

const CSV_HEADER = [
  'Nome',
  'Email',
  'Telefone',
  'Empresa',
  'Cargo',
  'Decisor',
  'Estagio',
  'Status',
  'Health Score',
  'Responsavel',
  'Data de Criacao',
].join(CSV_SEPARATOR)

export const exportContacts = orgActionClient
  .schema(exportContactsSchema)
  .action(async ({ parsedInput: filters, ctx }) => {
    // Leitura exige permissão base — MEMBER enxerga apenas contatos próprios (filtrado no data-access)
    requirePermission(canPerformAction(ctx, 'contact', 'read'))

    const contacts = await getContactsForExport(ctx, {
      search: filters.search || undefined,
      assignedTo: filters.assignedTo,
      companyId: filters.companyId,
      isDecisionMaker: filters.isDecisionMaker,
      hasDeals: filters.hasDeals,
      lifecycleStages:
        filters.lifecycleStages.length > 0
          ? filters.lifecycleStages
          : undefined,
      customerStatuses:
        filters.customerStatuses.length > 0
          ? filters.customerStatuses
          : undefined,
      healthScoreMin: filters.healthScoreMin,
      healthScoreMax: filters.healthScoreMax,
    })

    const rows = contacts.map((contact) => buildCsvRow(contact))
    const csv = [CSV_BOM + CSV_HEADER, ...rows].join('\n')

    return { csv, count: contacts.length }
  })
