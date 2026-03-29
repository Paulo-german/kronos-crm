import 'server-only'
import { db } from '@/_lib/prisma'
import type { AutomationAction, AutomationTrigger } from '@prisma/client'

export interface ActiveAutomationDto {
  id: string
  name: string
  triggerConfig: Record<string, unknown>
  conditions: unknown[]
  actionType: AutomationAction
  actionConfig: Record<string, unknown>
}

/**
 * Busca automações ativas para um tipo de trigger e organização.
 * Sem cache — chamado em tempo real pelo motor de execução (event hooks e cron).
 */
export async function getActiveAutomationsByTrigger(
  orgId: string,
  triggerType: AutomationTrigger,
): Promise<ActiveAutomationDto[]> {
  const automations = await db.automation.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      triggerType,
    },
    select: {
      id: true,
      name: true,
      triggerConfig: true,
      conditions: true,
      actionType: true,
      actionConfig: true,
    },
  })

  return automations.map((automation) => ({
    id: automation.id,
    name: automation.name,
    triggerConfig: automation.triggerConfig as Record<string, unknown>,
    conditions: automation.conditions as unknown[],
    actionType: automation.actionType,
    actionConfig: automation.actionConfig as Record<string, unknown>,
  }))
}
