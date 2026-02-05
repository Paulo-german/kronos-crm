import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { validateMembership } from '@/_data-access/organization/validate-membership'
import type { MemberRole } from '@prisma/client'

interface OrgContext {
  userId: string
  orgId: string
  userRole: MemberRole
}

/**
 * Obtém o contexto da organização para Server Components
 * Usado em pages dentro de /org/[orgSlug]/...
 */
export const getOrgContext = cache(
  async (orgSlug: string): Promise<OrgContext> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const membership = await validateMembership(user.id, orgSlug)

    if (!membership.isValid || !membership.orgId || !membership.userRole) {
      redirect('/org?clear_last_org=true')
    }

    return {
      userId: user.id,
      orgId: membership.orgId,
      userRole: membership.userRole,
    }
  },
)
