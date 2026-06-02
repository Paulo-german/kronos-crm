import 'server-only'

import { revalidateTag } from 'next/cache'
import { LifecycleCauseType } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { advanceContactLifecycle } from '@/_lib/lifecycle/advance-contact-lifecycle'
import { resolveTemplate } from '../template-resolver'
import type {
  ContactForEvaluation,
  ExecutorContext,
  ExecutorResult,
  UpdateContactLifecycleConfig,
} from '../types'

// Template default do título quando o usuário não informa um
const DEFAULT_DEAL_TITLE_TEMPLATE = '{{contact.name}}'

/**
 * Variante do executor UPDATE_CONTACT_LIFECYCLE para triggers de contato.
 * Avança o lifecycle do contato-sujeito e, opcionalmente, cria uma negociação vinculada.
 *
 * O deal é criado via Prisma direto: o executor é camada de execução de sistema,
 * sem RBAC/quota (diferente de uma server action). Deal.assignedTo é NOT NULL —
 * se nenhum responsável for resolvido, o deal NÃO é criado (o lifecycle ainda avança).
 */
export async function executeUpdateContactLifecycleContact(
  ctx: ExecutorContext,
): Promise<ExecutorResult> {
  if (!ctx.contact) return { summary: { skipped: true, reason: 'subject_not_contact' } }
  const contact = ctx.contact
  const config = ctx.actionConfig as unknown as UpdateContactLifecycleConfig

  // Avança o lifecycle do contato-sujeito. Sem deal → referência à própria automação.
  // advanceContactLifecycle já invalida o cache de lifecycle/contato internamente.
  const advanceResult = await advanceContactLifecycle({
    contactId: contact.id,
    organizationId: ctx.orgId,
    toStage: config.targetStage,
    causeType: LifecycleCauseType.MANUAL,
    causeRefId: ctx.automationId,
  })

  const lifecycleAdvanced = advanceResult.applied

  if (!config.createDeal) {
    return {
      summary: {
        targetStage: config.targetStage,
        lifecycleAdvanced,
        dealCreated: false,
      },
    }
  }

  // Config pode ter sido salva antes da extensão de criação de deal → ser defensivo.
  if (!config.dealStageId || !config.dealPipelineId) {
    return {
      summary: {
        targetStage: config.targetStage,
        lifecycleAdvanced,
        dealCreated: false,
        dealSkipReason: 'missing_pipeline_or_stage',
      },
    }
  }

  // Race: o estágio pode ter sido deletado/movido desde a configuração da automação.
  const stage = await db.pipelineStage.findFirst({
    where: {
      id: config.dealStageId,
      pipelineId: config.dealPipelineId,
      pipeline: { organizationId: ctx.orgId },
    },
    select: { id: true },
  })

  if (!stage) {
    return {
      summary: {
        targetStage: config.targetStage,
        lifecycleAdvanced,
        dealCreated: false,
        dealSkipReason: 'stage_not_found',
      },
    }
  }

  // Deal.assignedTo é NOT NULL — sem responsável resolvido, não cria deal órfão.
  const resolvedAssignee = resolveDealAssignee(config, contact)
  if (!resolvedAssignee) {
    return {
      summary: {
        targetStage: config.targetStage,
        lifecycleAdvanced,
        dealCreated: false,
        dealSkipReason: 'no_assignee',
      },
    }
  }

  const contactFirstName = contact.name.split(' ')[0] ?? ''
  const resolvedTitle = resolveTemplate(config.dealTitleTemplate || DEFAULT_DEAL_TITLE_TEMPLATE, {
    contact: { name: contact.name, firstName: contactFirstName },
    user: { name: '' },
  }).trim()
  const title = resolvedTitle || contact.name

  const deal = await db.deal.create({
    data: {
      organizationId: ctx.orgId,
      title,
      pipelineStageId: config.dealStageId,
      assignedTo: resolvedAssignee,
      ...(config.dealPriority ? { priority: config.dealPriority } : {}),
      // dealDefaultValue é tratado como reais (mesma convenção de create-deal-with-contact)
      ...(typeof config.dealDefaultValue === 'number' ? { value: config.dealDefaultValue } : {}),
      contacts: { create: { contactId: contact.id, isPrimary: true, role: '' } },
    },
    select: { id: true },
  })

  // revalidateTag lança fora de contexto de request (cron Trigger.dev) — proteger.
  try {
    revalidateTag(`pipeline:${ctx.orgId}`)
    revalidateTag(`deals:${ctx.orgId}`)
    revalidateTag(`deals-options:${ctx.orgId}`)
    revalidateTag(`dashboard:${ctx.orgId}`)
  } catch {
    // Fora de contexto de request (Trigger.dev) — invalidação não disponível.
  }

  return {
    summary: {
      targetStage: config.targetStage,
      lifecycleAdvanced,
      dealCreated: true,
      dealId: deal.id,
    },
  }
}

/**
 * Resolve o responsável do deal a criar.
 * 'specific_user' → usa o userId configurado.
 * 'contact_assignee' (default) → usa o responsável do contato (pode ser null em Contact).
 * Retorna null quando nenhum responsável pôde ser determinado.
 */
function resolveDealAssignee(
  config: UpdateContactLifecycleConfig,
  contact: ContactForEvaluation,
): string | null {
  if (config.dealAssignTo === 'specific_user') return config.dealAssignToUserId ?? null
  return contact.assignedTo ?? config.dealAssignToUserId ?? null
}
