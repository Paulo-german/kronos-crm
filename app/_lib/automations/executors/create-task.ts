import 'server-only'

import { after } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { TaskType } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import { resolveTemplate } from '../template-resolver'
import type { CreateTaskActionConfig, ExecutorContext, ExecutorResult } from '../types'

const DEFAULT_DUE_IN_DAYS = 1
const DEFAULT_PRIORITY: CreateTaskActionConfig['priority'] = 'medium'
const DEFAULT_TASK_TYPE: TaskType = 'TASK'
const MS_PER_DAY = 24 * 60 * 60 * 1000
const END_OF_DAY_HOURS = 23
const END_OF_DAY_MINUTES = 59

/**
 * Executor de criação de task — execução de sistema, sem RBAC.
 * Cria a Task vinculada ao deal disparador e a Activity correspondente.
 * Toca Prisma diretamente (db.task.create / db.activity.create) seguindo o padrão
 * dos demais executors — NÃO chama a server action createTask (que exige orgActionClient).
 * Notifica o responsável após o response, mesmo padrão de executeReassignDeal.
 */
export async function executeCreateTask(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as CreateTaskActionConfig

  // 1. Resolver responsável da task
  const assignedTo = await resolveAssignee(ctx, config)
  if (!assignedTo) {
    return {
      summary: {
        skipped: true,
        reason: 'no_valid_assignee',
        assignStrategy: config.assignTo,
      },
    }
  }

  // 2. Resolver template do título (reusa o resolver compartilhado)
  const [stage, assigneeUser] = await Promise.all([
    db.pipelineStage.findUnique({
      where: { id: ctx.deal.stageId },
      select: { name: true },
    }),
    db.user.findUnique({
      where: { id: ctx.deal.assignedTo },
      select: { fullName: true },
    }),
  ])

  const primaryContact =
    ctx.deal.contacts.find((contact) => contact.isPrimary) ?? ctx.deal.contacts[0]
  const contactFullName = primaryContact?.contact.name ?? ''
  const contactFirstName = contactFullName.split(' ')[0] ?? ''

  const resolvedTitle = resolveTemplate(config.titleTemplate, {
    deal: {
      title: ctx.deal.title,
      stage: stage?.name ?? ctx.deal.stageId,
      assignee: assigneeUser?.fullName ?? ctx.deal.assignedTo,
      status: ctx.deal.status,
      priority: ctx.deal.priority,
      value: ctx.deal.value != null ? String(ctx.deal.value) : '',
    },
    contact: { name: contactFullName, firstName: contactFirstName },
    user: { name: assigneeUser?.fullName ?? '' },
  })

  // 3. Calcular dueDate (normaliza para 23:59 do dia alvo — geração automática)
  const dueInDays = config.dueInDays ?? DEFAULT_DUE_IN_DAYS
  const dueDate = new Date(Date.now() + dueInDays * MS_PER_DAY)
  dueDate.setHours(END_OF_DAY_HOURS, END_OF_DAY_MINUTES, 0, 0)

  const taskType = (config.taskType ?? DEFAULT_TASK_TYPE) as TaskType
  const priority = config.priority ?? DEFAULT_PRIORITY

  // 4. Criar Task + Activity
  // createdBy: na ausência de ctx.userId em execução de sistema, gravamos o assignee
  // como criador (Task.createdBy é FK NOT NULL para User — não usar UUID fake).
  const task = await db.task.create({
    data: {
      organizationId: ctx.orgId,
      title: resolvedTitle,
      dueDate,
      dealId: ctx.deal.id,
      assignedTo,
      createdBy: assignedTo,
      type: taskType,
      isCompleted: false,
    },
  })

  await db.activity.create({
    data: {
      type: 'task_created',
      content: resolvedTitle,
      dealId: ctx.deal.id,
      // performedBy null = ação de sistema (mesmo padrão dos outros executors)
      performedBy: null,
      metadata: {
        source: 'automation',
        automationId: ctx.automationId,
        automationName: ctx.automationName,
        taskId: task.id,
        taskType,
        priority,
        dueDate: dueDate.toISOString(),
        assignedTo,
      },
    },
  })

  // 5. Invalidar caches da listagem de tasks e do deal
  revalidateTag(`tasks:${ctx.orgId}`)
  revalidateTag(`deal:${ctx.deal.id}`)
  revalidateTag(`deals:${ctx.orgId}`)
  revalidatePath('/crm/tasks')
  revalidatePath('/crm/deals/pipeline')
  revalidatePath(`/crm/deals/${ctx.deal.id}`)

  // 6. Notificar responsável após o response (paridade com executeReassignDeal)
  after(async () => {
    const slug = await getOrgSlug(ctx.orgId)
    await createNotification({
      orgId: ctx.orgId,
      userId: assignedTo,
      type: 'USER_ACTION',
      title: 'Nova tarefa criada pela automação',
      body: `A tarefa "${resolvedTitle}" foi atribuída a você pela automação "${ctx.automationName}".`,
      actionUrl: slug ? `/org/${slug}/crm/deals/${ctx.deal.id}` : undefined,
      resourceType: 'task',
      resourceId: task.id,
    })
  })

  return {
    summary: {
      taskId: task.id,
      assignedTo,
      dueDate: dueDate.toISOString(),
      taskType,
      priority,
    },
  }
}

/**
 * Resolve o assignee final da task conforme a estratégia configurada.
 * Para 'specific_user', valida que o usuário ainda é membro ACCEPTED da org —
 * se foi removido entre criação da automação e execução, retorna null (skip controlado).
 */
async function resolveAssignee(
  ctx: ExecutorContext,
  config: CreateTaskActionConfig,
): Promise<string | null> {
  if (config.assignTo === 'deal_assignee') {
    return ctx.deal.assignedTo
  }

  if (!config.assignToUserId) return null

  const member = await db.member.findFirst({
    where: {
      organizationId: ctx.orgId,
      status: 'ACCEPTED',
      userId: config.assignToUserId,
    },
    select: { userId: true },
  })

  return member?.userId ?? null
}
