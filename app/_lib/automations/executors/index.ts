import 'server-only'

import type { AutomationAction } from '@prisma/client'
import type { ExecutorContext, ExecutorResult } from '../types'
import { executeReassignDeal } from './reassign-deal'
import { executeMoveDealToStage } from './move-deal-to-stage'
import { executeMarkDealLost } from './mark-deal-lost'
import { executeNotifyUser } from './notify-user'
import { executeUpdateDealPriority } from './update-deal-priority'

type ExecutorFn = (ctx: ExecutorContext) => Promise<ExecutorResult>

/**
 * Registry que mapeia AutomationAction → função executora.
 * Exaustivo: o TypeScript garante que nenhum action type fique sem cobertura.
 */
const EXECUTOR_REGISTRY: Record<AutomationAction, ExecutorFn> = {
  REASSIGN_DEAL: executeReassignDeal,
  MOVE_DEAL_TO_STAGE: executeMoveDealToStage,
  MARK_DEAL_LOST: executeMarkDealLost,
  NOTIFY_USER: executeNotifyUser,
  UPDATE_DEAL_PRIORITY: executeUpdateDealPriority,
}

export function getExecutor(actionType: AutomationAction): ExecutorFn {
  return EXECUTOR_REGISTRY[actionType]
}
