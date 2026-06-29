import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getSimulatorDebugTimeline } from '@/_data-access/conversation/get-simulator-debug-timeline'
import { getSimulatorDebugExecutions } from '@/_data-access/conversation/get-simulator-debug-executions'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'
import { db } from '@/_lib/prisma'

interface RouteContext {
  params: Promise<{ conversationId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Guard: o painel de debug é exclusivo de super admins (como as actions do simulador).
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { isSuperAdmin: true },
    })

    if (!dbUser?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      return NextResponse.json({ error: 'No org context' }, { status: 400 })
    }

    const membership = await validateMembership(user.id, orgSlug)
    if (!membership.isValid || !membership.orgId) {
      return NextResponse.json({ error: 'No access' }, { status: 403 })
    }

    // 3. Validar conversa pertence à org E é de fato simulada (404 se não for, sem vazar existência).
    const { conversationId } = await context.params

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: membership.orgId,
        inbox: { connectionType: 'SIMULATOR' },
      },
      select: {
        id: true,
        currentStepOrder: true,
        inbox: {
          select: {
            agent: {
              select: { steps: { select: { order: true, name: true } } },
            },
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Etapa atual do processo do agente (best-effort: omite se não resolver).
    const activeStep = conversation.inbox.agent?.steps.find(
      (step) => step.order === conversation.currentStepOrder,
    )
    const currentStep = activeStep
      ? { order: activeStep.order, name: activeStep.name }
      : null

    const [entries, executions] = await Promise.all([
      getSimulatorDebugTimeline(conversationId),
      getSimulatorDebugExecutions(conversationId),
    ])

    return NextResponse.json({ entries, executions, currentStep })
  } catch (error) {
    console.error('[simulator-debug-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
