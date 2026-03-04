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

  // Se só 1 org, renderiza nome estático sem dropdown
  if (organizations.length <= 1) {
    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center py-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{organization.name}</TooltipContent>
        </Tooltip>
      )
    }

    return (
      <div className="flex items-center gap-2 px-3 py-3">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {organization.name}
        </span>
      </div>
    )
  }

  const trigger = isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="flex w-full items-center justify-center rounded-md py-3 hover:bg-accent">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Trocar organização</TooltipContent>
    </Tooltip>
  ) : (
    <button
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent',
        'transition-colors',
      )}
    >
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-left">{organization.name}</span>
      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
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
                  <Check className="h-4 w-4 shrink-0" />
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
