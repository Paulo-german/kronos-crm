'use server'
import { superAdminActionClient } from '@/_lib/safe-action'
import { fetchAdminOrganizationMembersSchema } from './schema'
import { getAdminOrganizationMembers } from '@/_data-access/admin/get-admin-organization-members'

export const fetchAdminOrganizationMembers = superAdminActionClient
  .schema(fetchAdminOrganizationMembersSchema)
  .action(async ({ parsedInput: { organizationId } }) => {
    return getAdminOrganizationMembers(organizationId)
  })
