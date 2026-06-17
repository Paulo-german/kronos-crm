import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import { getDealsByPipelineStage } from '@/_data-access/deal/get-deals-by-pipeline-stage'
import {
  parseDealSort,
  parsePipelineDealFilters,
} from '@/_data-access/deal/pipeline-deals-params'
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
    const stageId = searchParams.get('stageId')
    if (!stageId) {
      return NextResponse.json({ error: 'Missing stageId' }, { status: 400 })
    }

    const cursor = searchParams.get('cursor') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const sort = parseDealSort(searchParams.get('sort'))
    const filters = parsePipelineDealFilters(searchParams)

    const result = await getDealsByPipelineStage(
      stageId,
      {
        userId: user.id,
        orgId: membership.orgId,
        userRole: membership.userRole,
      },
      { sort, filters, cursor, limit },
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[pipeline-deals-api] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
