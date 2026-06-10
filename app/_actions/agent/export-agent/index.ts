'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getAgentForExport } from '@/_data-access/agent/get-agent-for-export'
import { exportAgentSchema } from './schema'
import { buildAgentExport } from './build-export'

const slugify = (value: string): string => {
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'agent'
}

export const exportAgent = orgActionClient
  .schema(exportAgentSchema)
  .action(async ({ parsedInput: { agentId }, ctx }) => {
    // Export gera um clone completo (prompt + tools) — gate em 'update' restringe
    // a managers (OWNER/ADMIN/SUPPORT), igual a 'create'. MEMBER (só 'read') não
    // pode exfiltrar a configuração completa do agente.
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const row = await getAgentForExport(agentId, ctx.orgId)
    if (!row) {
      throw new Error('Agente não encontrado.')
    }

    const payload = buildAgentExport(row)

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fileName = `agent-${slugify(row.name)}-${datePart}.json`

    // Export é leitura pura — não invalida cache.
    return { success: true, fileName, payload }
  })
