import 'server-only'

import { logger } from '@trigger.dev/sdk/v3'
import { LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { applyLifecycleTrigger } from '../apply-lifecycle-trigger'
import { applyStepAutoActions } from '../apply-step-auto-actions'
import { getFollowUpsForStep } from '@/_data-access/follow-up/get-follow-ups-for-step'
import { createConversationEvent } from '../create-conversation-event'
import type { InfoSubtype } from '@/_lib/conversation-events/types'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface StepInfo {
  id: string
  order: number
  name: string
  lifecycleTrigger: LifecycleStage | null
  lifecycleDealPipelineId: string | null
  autoDealStageId: string | null
  autoTasks: Array<{ title: string; dueInDays: number }> | null
  actions: StepAction[]
}

export interface ApplyStepAdvanceInput {
  classifiedId: string | undefined
  currentStepOrder: number
  totalSteps: number
  steps: StepInfo[]
  conversationId: string
  organizationId: string
  agentId: string
  agentName: string
  contactId: string | null
  dealId: string | null
  isV2?: boolean
}

export interface ApplyStepAdvanceOutput {
  newStepOrder: number
  stepAdvanced: boolean
  followUpScheduled: boolean
  followUpFirstDelayMinutes?: number
  totalFollowUps?: number
}

// ---------------------------------------------------------------------------
// applyStepAdvance — persiste avanço de step, lifecycle, auto-ações e follow-up
//
// Todas as sub-operações são non-fatal individualmente: falhas são logadas mas
// não propagam para não bloquear o retorno ao caller.
// ---------------------------------------------------------------------------

export async function applyStepAdvance(
  input: ApplyStepAdvanceInput,
): Promise<ApplyStepAdvanceOutput> {
  const {
    classifiedId,
    currentStepOrder,
    totalSteps,
    steps,
    conversationId,
    organizationId,
    agentId,
    agentName,
    contactId,
    dealId,
    isV2 = false,
  } = input

  // Guard de monotonicidade: step só avança, nunca regride.
  const classifiedStep = classifiedId
    ? steps.find((step) => step.id === classifiedId)?.order
    : undefined
  const newStepOrder =
    classifiedStep !== undefined
      ? Math.max(currentStepOrder, Math.min(classifiedStep, totalSteps - 1))
      : currentStepOrder
  const stepAdvanced = newStepOrder > currentStepOrder
  // ID do step efetivamente aplicado após clamping — pode diferir do classifiedId original
  const appliedStepId = steps[newStepOrder]?.id ?? null

  let followUpScheduled = false
  let followUpFirstDelayMinutes: number | undefined
  let totalFollowUps: number | undefined

  try {
    if (stepAdvanced) {
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          currentStepOrder: newStepOrder,
          nextFollowUpAt: null,
          followUpCount: 0,
        },
      })

      await createConversationEvent({
        conversationId,
        type: 'INFO',
        content: `Conversa avançou para etapa ${newStepOrder + 1}`,
        metadata: {
          subtype: 'STEP_ADVANCED' satisfies InfoSubtype,
          previousStep: currentStepOrder,
          newStep: newStepOrder,
          newStepId: appliedStepId,
          newStepName: steps[newStepOrder]?.name,
          // classifiedId original do LLM; newStepId é o que foi efetivamente usado após clamping
          classifiedByLlm: classifiedId ?? null,
        },
      })

      const newStep = steps[newStepOrder]

      if (newStep?.lifecycleTrigger && contactId) {
        try {
          await applyLifecycleTrigger({
            conversationId,
            organizationId,
            contactId,
            toStage: newStep.lifecycleTrigger,
            dealPipelineId: newStep.lifecycleDealPipelineId,
          })
        } catch (lifecycleErr) {
          logger.error('lifecycle:trigger_failed', {
            conversationId,
            error:
              lifecycleErr instanceof Error
                ? lifecycleErr.message
                : String(lifecycleErr),
          })
        }
      }

      if (newStep && (newStep.autoDealStageId || newStep.autoTasks)) {
        try {
          await applyStepAutoActions({
            conversationId,
            organizationId,
            agentId,
            agentName,
            dealId,
            autoDealStageId: newStep.autoDealStageId,
            autoTasks: newStep.autoTasks,
          })
        } catch (autoActionsErr) {
          logger.error('step:auto_actions_failed', {
            conversationId,
            error:
              autoActionsErr instanceof Error
                ? autoActionsErr.message
                : String(autoActionsErr),
          })
        }
      }

      // v2: move_deal e create_task saem do LLM e passam a executar aqui,
      // deterministicamente, com os parâmetros já configurados no step builder.
      if (isV2 && newStep) {
        const moveDealAction = newStep.actions.find(
          (action): action is Extract<StepAction, { type: 'move_deal' }> => action.type === 'move_deal',
        )
        const createTaskActions = newStep.actions.filter(
          (action): action is Extract<StepAction, { type: 'create_task' }> => action.type === 'create_task',
        )

        if (moveDealAction || createTaskActions.length > 0) {
          try {
            await applyStepAutoActions({
              conversationId,
              organizationId,
              agentId,
              agentName,
              dealId,
              autoDealStageId: moveDealAction?.targetStage ?? null,
              autoTasks: createTaskActions.length > 0
                ? createTaskActions.map((action) => ({ title: action.title, dueInDays: action.dueDaysOffset }))
                : null,
            })
          } catch (v2ActionsErr) {
            logger.error('step:v2_step_actions_failed', {
              conversationId,
              error: v2ActionsErr instanceof Error ? v2ActionsErr.message : String(v2ActionsErr),
            })
          }
        }
      }
    }

    const followUps = await getFollowUpsForStep(agentId, newStepOrder)

    if (followUps.length > 0) {
      const firstFollowUp = followUps[0]
      const nextFollowUpAt = new Date(
        Date.now() + firstFollowUp.delayMinutes * 60 * 1000,
      )

      await db.conversation.update({
        where: { id: conversationId },
        data: { nextFollowUpAt, followUpCount: 0 },
      })

      followUpScheduled = true
      followUpFirstDelayMinutes = firstFollowUp.delayMinutes
      totalFollowUps = followUps.length
    } else {
      await db.conversation.update({
        where: { id: conversationId },
        data: { nextFollowUpAt: null, followUpCount: 0 },
      })
    }
  } catch (fupError) {
    logger.error('Follow-up scheduling failed', {
      conversationId,
      error: fupError instanceof Error ? fupError.message : String(fupError),
    })
    // Limpar estado para evitar estado órfão que ficaria disparando o cron indefinidamente
    await db.conversation
      .update({
        where: { id: conversationId },
        data: { nextFollowUpAt: null, followUpCount: 0 },
      })
      .catch(() => {})
  }

  return {
    newStepOrder,
    stepAdvanced,
    followUpScheduled,
    followUpFirstDelayMinutes,
    totalFollowUps,
  }
}
