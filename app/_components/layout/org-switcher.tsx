'use client'

import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronsUpDown } from 'lucide-react'
import { useOrganization } from '@/_providers/organization-provider'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { Badge } from '@/_components/ui/badge'
import type { MemberRole } from '@prisma/client'

interface OrgItem {
  id: string
  name: string
  slug: string
  role: MemberRole
}

interface OrgSwitcherProps {
  organizations: OrgItem[]
}

const roleLabelMap: Record<MemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
}

export function OrgSwitcher({ organizations }: OrgSwitcherProps) {
  const { organization } = useOrganization()
  const { isCollapsed } = useSidebar()
  const router = useRouter()

  const handleSwitch = (slug: string) => {
    if (slug === organization.slug) return
    router.push(`/org/${slug}/dashboard`)
  }

  const hasMultipleOrgs = organizations.length > 1

  const content = (
    <div
      role={hasMultipleOrgs ? 'button' : undefined}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex items-center rounded-md py-2 text-sm font-medium text-muted-foreground transition-all duration-500',
        hasMultipleOrgs && 'cursor-pointer hover:bg-primary/10 hover:text-primary',
        isCollapsed ? 'ml-2 mr-2 pl-3 pr-0' : 'px-3',
      )}
    >
      <div className="flex items-center">
        <Building2 className="h-4 w-4 shrink-0" />
      </div>
      <span
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-500',
          isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-full opacity-100 delay-100',
        )}
      >
        <span className="truncate">{organization.name}</span>
        {hasMultipleOrgs && (
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </span>
    </div>
  )

  // Collapsed: sempre mostra tooltip
  if (isCollapsed && !hasMultipleOrgs) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {organization.name}
        </TooltipContent>
      </Tooltip>
    )
  }

  // Sem dropdown se só 1 org
  if (!hasMultipleOrgs) {
    return content
  }

  // Multi-org: dropdown
  const trigger = isCollapsed ? (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        Trocar organização
      </TooltipContent>
    </Tooltip>
  ) : (
    content
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={isCollapsed ? 'right' : 'bottom'}
        align="start"
        className="w-60"
      >
        {organizations.map((org) => {
          const isActive = org.slug === organization.slug
          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitch(org.slug)}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                {isActive ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <div className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{org.name}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {roleLabelMap[org.role]}
              </Badge>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
