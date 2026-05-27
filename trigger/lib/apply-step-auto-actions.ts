import 'server-only'

import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { withRetry, safeBestEffort } from '../tools/lib/with-retry'
import { revalidateTags } from '../tools/lib/revalidate-tags'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'

interface AutoTask {
  title: string
  dueInDays: number
}

interface ApplyStepAutoActionsInput {
  conversationId: string
  organizationId: string
  agentId: string
  agentName: string
  dealId: string | null
  autoDealStageId: string | null
  autoTasks: AutoTask[] | null
}

interface ApplyStepAutoActionsResult {
  dealMoved: boolean
  tasksCreated: number
}

export async function applyStepAutoActions(
  input: ApplyStepAutoActionsInput,
): Promise<ApplyStepAutoActionsResult> {
  const { conversationId, organizationId, agentId, agentName, dealId, autoDealStageId, autoTasks } =
    input

  if (!dealId) {
    logger.warn('step:auto_actions_skipped_no_deal', { conversationId, organizationId })
    return { dealMoved: false, tasksCreated: 0 }
  }

  let dealMoved = false
  let tasksCreated = 0

  if (autoDealStageId) {
    try {
      dealMoved = await moveDeal({ dealId, organizationId, agentId, agentName, conversationId, targetStageId: autoDealStageId })
    } catch (err) {
      logger.error('step:auto_move_deal_failed', {
        conversationId,
        dealId,
        targetStageId: autoDealStageId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (autoTasks && autoTasks.length > 0) {
    try {
      tasksCreated = await createTasks({ dealId, organizationId, agentId, agentName, conversationId, tasks: autoTasks })
    } catch (err) {
      logger.error('step:auto_create_tasks_failed', {
        conversationId,
        dealId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { dealMoved, tasksCreated }
}

// ---------------------------------------------------------------------------
// Helpers privados
// ---------------------------------------------------------------------------

async function moveDeal(params: {
  dealId: string
  organizationId: string
  agentId: string
  agentName: string
  conversationId: string
  targetStageId: string
}): Promise<boolean> {
  const { dealId, organizationId, agentId, agentName, conversationId, targetStageId } = params

  const deal = await db.deal.findFirst({
    where: { id: dealId, organizationId },
    select: {
      status: true,
      pipelineStageId: true,
      stage: { select: { id: true, name: true, pipelineId: true } },
    },
  })

  if (!deal) {
    logger.warn('step:auto_move_deal_not_found', { conversationId, dealId })
    return false
  }

  if (deal.status === 'WON' || deal.status === 'LOST') {
    logger.warn('step:auto_move_deal_skipped_finalized', { conversationId, dealId, status: deal.status })
    return false
  }

  const newStage = await db.pipelineStage.findFirst({
    where: { id: targetStageId, pipelineId: deal.stage.pipelineId },
  })

  if (!newStage) {
    logger.warn('step:auto_move_deal_stage_not_found', { conversationId, dealId, targetStageId })
    return false
  }

  if (deal.pipelineStageId === newStage.id) return true

  await withRetry(
    () =>
      db.deal.update({
        where: { id: dealId },
        data: {
          pipelineStageId: newStage.id,
          ...(deal.status === 'OPEN' && { status: 'IN_PROGRESS' }),
        },
      }),
    'db.deal.update(auto_move)',
  )

  await safeBestEffort(
    () =>
      db.activity.create({
        data: {
          type: 'stage_change',
          content: `${deal.stage.name} → ${newStage.name}`,
          dealId,
          performedBy: null,
          metadata: { agentId, agentName, auto: true },
        },
      }),
    'activity.create(auto_move)',
  )

  await safeBestEffort(
    () =>
      revalidateTags([
        `pipeline:${organizationId}`,
        `deals:${organizationId}`,
        `deal:${dealId}`,
        `dashboard:${organizationId}`,
        `dashboard-charts:${organizationId}`,
      ]),
    'revalidateTags(auto_move)',
  )

  logger.info('step:auto_move_deal_applied', {
    conversationId,
    dealId,
    fromStage: deal.stage.name,
    toStage: newStage.name,
  })

  await safeBestEffort(
    () => evaluateAutomations({
      subjectKind: 'deal',
      orgId: organizationId,
      triggerType: 'DEAL_MOVED',
      dealId,
      payload: {
        fromStageId: deal.pipelineStageId,
        toStageId: newStage.id,
        pipelineId: deal.stage.pipelineId,
      },
    }),
    'evaluateAutomations(auto_move)',
  )

  return true
}

async function createTasks(params: {
  dealId: string
  organizationId: string
  agentId: string
  agentName: string
  conversationId: string
  tasks: AutoTask[]
}): Promise<number> {
  const { dealId, organizationId, agentId, agentName, conversationId, tasks } = params

  const deal = await db.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { assignedTo: true },
  })

  if (!deal) {
    logger.warn('step:auto_create_tasks_deal_not_found', { conversationId, dealId })
    return 0
  }

  const now = Date.now()
  let created = 0

  for (const task of tasks) {
    try {
      const dueDate = new Date(now + task.dueInDays * 24 * 60 * 60 * 1000)

      await withRetry(
        () =>
          db.task.create({
            data: {
              organizationId,
              title: task.title,
              dueDate,
              dealId,
              assignedTo: deal.assignedTo,
              createdBy: deal.assignedTo,
              type: 'TASK',
            },
          }),
        'db.task.create(auto_task)',
      )

      await safeBestEffort(
        () =>
          db.activity.create({
            data: {
              type: 'task_created',
              content: task.title,
              dealId,
              performedBy: null,
              metadata: { agentId, agentName, auto: true },
            },
          }),
        'activity.create(auto_task)',
      )

      created++
    } catch (taskErr) {
      logger.error('step:auto_create_task_item_failed', {
        conversationId,
        dealId,
        title: task.title,
        error: taskErr instanceof Error ? taskErr.message : String(taskErr),
      })
    }
  }

  if (created > 0) {
    await safeBestEffort(
      () =>
        revalidateTags([
          `deal:${dealId}`,
          `deals:${organizationId}`,
          `tasks:${organizationId}`,
        ]),
      'revalidateTags(auto_tasks)',
    )

    logger.info('step:auto_create_tasks_applied', {
      conversationId,
      dealId,
      tasksCreated: created,
    })
  }

  return created
}
