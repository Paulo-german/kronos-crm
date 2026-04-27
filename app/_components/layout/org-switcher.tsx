'use client'

import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Plus } from 'lucide-react'
import { useOrganization } from '@/_providers/organization-provider'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

const OrgAvatar = ({
  name,
  active,
  onDark,
}: {
  name: string
  active?: boolean
  onDark?: boolean
}) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  return (
    <div
      className={cn(
        'flex h-[1.45rem] w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold leading-none ring-1',
        onDark
          ? cn(
              'bg-white/20 text-white',
              active ? 'ring-white/80' : 'ring-white/30',
            )
          : cn(
              'bg-primary/20 text-primary',
              active ? 'ring-primary' : 'ring-primary/20',
            ),
      )}
    >
      {initials}
    </div>
  )
}

const roleLabelMap: Record<MemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
}

export function OrgSwitcher({ organizations }: OrgSwitcherProps) {
  const { organization, userRole } = useOrganization()
  const { isCollapsed, isAnimating } = useSidebar()
  const router = useRouter()

  const handleSwitch = (slug: string) => {
    if (slug === organization.slug) return
    router.push(`/org/${slug}/dashboard`)
  }

  const content = (
    <div
      role="button"
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex items-center rounded-md py-2 text-sm font-medium text-muted-foreground transition-all duration-500',
        'cursor-pointer hover:bg-primary/10 hover:text-primary',
        isCollapsed ? 'mx-2 px-2.5' : 'px-2.5',
        isAnimating && 'pointer-events-none',
      )}
    >
      <div className="flex items-center">
        <OrgAvatar name={organization.name} />
      </div>
      <span
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex min-w-0 items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-500',
          isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-full opacity-100 delay-100',
        )}
      >
        <span className="truncate">{organization.name}</span>
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </span>
    </div>
  )

  return (
    <DropdownMenu>
      <Tooltip
        delayDuration={300}
        open={!isCollapsed || isAnimating ? false : undefined}
      >
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>{content}</DropdownMenuTrigger>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent
            side="right"
            sideOffset={10}
            className="w-48 space-y-1 p-3 shadow-none"
          >
            <div className="flex items-center gap-2">
              <OrgAvatar name={organization.name} active onDark />
              <span className="truncate font-medium">{organization.name}</span>
            </div>
            <p className="text-[10px] text-white/50">
              {roleLabelMap[userRole]} · Clique para trocar
            </p>
          </TooltipContent>
        )}
      </Tooltip>

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
                <OrgAvatar name={org.name} active={isActive} />
                <span className="truncate">{org.name}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {roleLabelMap[org.role]}
              </Badge>
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/org?show=true')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Criar organização</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
