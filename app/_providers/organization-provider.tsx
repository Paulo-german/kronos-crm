'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { MemberRole } from '@prisma/client'

interface Organization {
  id: string
  name: string
  slug: string
}

interface OrganizationContextType {
  organization: Organization
  userRole: MemberRole
  isOwner: boolean
  isAdmin: boolean
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

interface OrganizationProviderProps {
  children: ReactNode
  organization: Organization
  userRole: MemberRole
}

export function OrganizationProvider({
  children,
  organization,
  userRole,
}: OrganizationProviderProps) {
  const isOwner = userRole === 'OWNER'
  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER'

  return (
    <OrganizationContext.Provider
      value={{ organization, userRole, isOwner, isAdmin }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error(
      'useOrganization must be used within an OrganizationProvider',
    )
  }
  return context
}
