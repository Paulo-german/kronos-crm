import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getPipelineStageAggregates } from '@/_data-access/deal/get-pipeline-stage-aggregates'
import { parsePipelineDealFilters } from '@/_data-access/deal/pipeline-deals-params'
import { ORG_SLUG_COOKIE } from '@/_lib/constants'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const orgSlug = cookieStore.get(ORG_SLUG_COOKIE)?.value

    if (!orgSlug) {
      return NextResponse.json({ error: 'No org context' }, { status: 400 })
    }

    const membership = await validateMembership(user.id, orgSlug)
    if (!membership.isValid || !membership.orgId || !membership.userRole) {
      return NextResponse.json({ error: 'No access' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const pipelineId = searchParams.get('pipelineId')
    if (!pipelineId) {
      return NextResponse.json({ error: 'Missing pipelineId' }, { status: 400 })
    }

    const stageIds = (searchParams.get('stageIds') ?? '')
      .split(',')
      .filter(Boolean)

    const filters = parsePipelineDealFilters(searchParams)

    const aggregates = await getPipelineStageAggregates(
      pipelineId,
      stageIds,
      {
        userId: user.id,
        orgId: membership.orgId,
        userRole: membership.userRole,
      },
      filters,
    )

    return NextResponse.json({ aggregates })
  } catch (error) {
    console.error('[pipeline-aggregates-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
