import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { getAgentExecutionById } from '@/_data-access/agent-execution/get-agent-execution-by-id'
import { canPerformAction } from '@/_lib/rbac/guards'
import type { MemberRole } from '@prisma/client'

/**
 * GET /api/agent-executions/[executionId]?orgSlug=xxx
 *
 * Retorna os detalhes de uma execução do agente com seus steps.
 * Chamado pelo cliente ao expandir um card de execução.
 * Requer permissão agent.update (apenas OWNER e ADMIN).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { executionId } = await params
  const { searchParams } = new URL(request.url)
  const orgSlug = searchParams.get('orgSlug')

  if (!orgSlug) {
    return NextResponse.json(
      { error: 'orgSlug is required' },
      { status: 400 },
    )
  }

  // Validar membership e obter orgId
  const member = await db.member.findFirst({
    where: {
      userId: user.id,
      status: 'ACCEPTED',
      organization: { slug: orgSlug },
    },
    select: { organizationId: true, role: true },
  })

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // RBAC: apenas OWNER e ADMIN podem visualizar execuções
  const permission = canPerformAction(
    { userId: user.id, orgId: member.organizationId, userRole: member.role as MemberRole },
    'agent',
    'update',
  )

  if (!permission.allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const execution = await getAgentExecutionById(executionId, member.organizationId)

  if (!execution) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(execution)
}
