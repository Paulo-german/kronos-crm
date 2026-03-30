'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  CalendarClock,
  Settings,
  Inbox,
  Bot,
  Shield,
} from 'lucide-react'
import { SidebarItem } from '@/_components/layout/sidebar-item'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { SignOutButton } from '@/_components/auth/sign-out-button'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'
import { CreditsBadgeClient } from '@/_components/credits/credits-badge-client'
import { OrgSwitcher } from '@/_components/layout/org-switcher'
import type { ModuleSlug } from '@/_data-access/module/types'
import type { MemberRole } from '@prisma/client'

interface SidebarContentProps {
  activeModules?: ModuleSlug[]
  organizations?: { id: string; name: string; slug: string; role: MemberRole }[]
  isSuperAdmin?: boolean
  credits?: { available: number; monthlyLimit: number; orgSlug: string }
  onNavigate?: () => void
}

export const SidebarContent = ({
  activeModules = [],
  organizations = [],
  isSuperAdmin = false,
  credits,
  onNavigate,
}: SidebarContentProps) => {
  const { isCollapsed } = useSidebar()
  const params = useParams()
  const orgSlug = params?.orgSlug as string | undefined

  const hasModule = (slug: ModuleSlug) => activeModules.includes(slug)

  const buildHref = (path: string) => {
    if (orgSlug) {
      return `/org/${orgSlug}${path}`
    }
    return path
  }

  const sectionTitleClass = cn(
    'ease-[cubic-bezier(0.25,0.76,0.35,1)] mb-1 block overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 transition-all duration-700',
    isCollapsed ? 'h-0 opacity-0' : 'h-auto px-3 opacity-100',
  )

  return (
    <div className="flex h-full flex-col" onClick={onNavigate}>
      {/* Header */}
      <div
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex h-16 items-center border-b border-border/50 transition-[padding] duration-700',
          isCollapsed ? 'pl-6 pr-0' : 'px-6',
        )}
      >
        <Link
          href={buildHref('/dashboard')}
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <KronosLogo />
          <span
            className={cn(
              'ease-[cubic-bezier(0.25,0.76,0.35,1)] overflow-hidden whitespace-nowrap text-xl font-bold tracking-tight transition-all duration-700',
              isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 delay-100',
            )}
          >
            KRONOS
          </span>
        </Link>
      </div>

      {/* Org Switcher */}
      <div
        className={cn(
          'border-b border-border/50 py-2',
          isCollapsed ? 'px-2' : 'px-4',
        )}
      >
        <OrgSwitcher organizations={organizations} />
      </div>

      {/* Menu */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto py-4',
          isCollapsed ? 'px-2' : 'px-4',
        )}
      >
        <div className="grid gap-1 space-y-4">
          {/* Globais - sempre visíveis */}
          <div>
            <SidebarItem
              href={buildHref('/dashboard')}
              label="Dashboard"
              icon={<LayoutDashboard className="h-4 w-4" />}
              dataTour="dashboard"
            />
            <SidebarItem
              href={buildHref('/contacts')}
              label="Contatos"
              icon={<Users className="h-4 w-4" />}
              dataTour="contacts"
            />
          </div>

          {/* Módulo: CRM */}
          {hasModule('crm') && (
            <div>
              <span className={sectionTitleClass}>CRM</span>
              <SidebarItem
                href={buildHref('/crm/tasks')}
                label="Tarefas"
                icon={<CheckSquare className="h-4 w-4" />}
              />
              <SidebarItem
                href={buildHref('/crm/deals')}
                label="Negociações"
                icon={<Kanban className="h-4 w-4" />}
                dataTour="deals"
              />
              <SidebarItem
                href={buildHref('/crm/appointments')}
                label="Agendamentos"
                icon={<CalendarClock className="h-4 w-4" />}
              />
            </div>
          )}

          {/* Módulo: Inbox */}
          {hasModule('inbox') && (
            <div>
              <span className={sectionTitleClass}>Inbox</span>
              <SidebarItem
                href={buildHref('/inbox')}
                label="Conversas"
                icon={<Inbox className="h-4 w-4" />}
                dataTour="inbox"
              />
            </div>
          )}

          {/* Módulo: AI Agent */}
          {hasModule('ai-agent') && (
            <div>
              <span className={sectionTitleClass}>Agentes</span>
              <SidebarItem
                href={buildHref('/ai-agent')}
                label="Agentes"
                icon={<Bot className="h-4 w-4" />}
                dataTour="ai-agent"
              />
            </div>
          )}
        </div>
      </nav>

      {/* Créditos */}
      <div className={cn('py-2', isCollapsed ? 'px-2' : 'px-4')}>
        {credits && (
          <CreditsBadgeClient
            available={credits.available}
            monthlyLimit={credits.monthlyLimit}
            orgSlug={credits.orgSlug}
          />
        )}
      </div>

      {/* Ajustes */}
      <div
        className={cn(
          'border-t border-border/50 py-3',
          isCollapsed ? 'px-2' : 'px-4',
        )}
      >
        {isSuperAdmin && (
          <SidebarItem
            href="/admin/dashboard"
            label="Delfos Admin"
            icon={<Shield className="h-4 w-4" />}
          />
        )}
        <SidebarItem
          href={buildHref('/settings')}
          label="Configurações"
          icon={<Settings className="h-4 w-4" />}
          dataTour="settings"
        />
        <SignOutButton isCollapsed={isCollapsed} />
      </div>
    </div>
  )
}
