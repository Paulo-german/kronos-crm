'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Bot,
  type LucideIcon,
  CircleIcon,
} from 'lucide-react'
import { SidebarItem } from '@/_components/layout/sidebar-item'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { SignOutButton } from '@/_components/auth/sign-out-button'
import { useSidebar } from '@/_providers/sidebar-provider'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import type { ModuleNavGroup } from '@/_lib/modules/navigation'
import { Badge } from '../ui/badge'

const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  CheckSquare,
  Kanban,
  Inbox,
  Bot,
}

interface AppSidebarProps {
  navGroups?: ModuleNavGroup[]
  footerSlot?: React.ReactNode
}

export const AppSidebar = ({ navGroups = [], footerSlot }: AppSidebarProps) => {
  const { isCollapsed, toggle } = useSidebar()
  const params = useParams()
  const orgSlug = params?.orgSlug as string | undefined

  const buildHref = (path: string) => {
    if (orgSlug) {
      return `/org/${orgSlug}${path}`
    }
    return path
  }

  return (
    <aside
      className={cn(
        'relative hidden h-full flex-col border-r border-border/50 bg-secondary/20 text-card-foreground transition-all duration-500 ease-in-out md:flex',
        isCollapsed ? 'w-[72px]' : 'w-64',
      )}
    >
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

      {/* Floating Toggle Button */}
      <div className="absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 md:flex">
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          className="h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent hover:text-accent-foreground"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className={cn('grid gap-1', isCollapsed ? 'px-2' : 'px-4')}>
          {/* Itens globais - sempre visíveis */}
          <div className="space-y-4">
            <div>
              <SidebarItem
                href={buildHref('/dashboard')}
                label="Dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
              />

              <SidebarItem
                href={buildHref('/contacts')}
                label="Contatos"
                icon={<Users className="h-4 w-4" />}
              />
            </div>
            <div>
              <span
                className={cn(
                  'ease-[cubic-bezier(0.25,0.76,0.35,1)] mb-1 block overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 transition-all duration-700',
                  isCollapsed ? 'h-0 opacity-0' : 'h-auto px-3 opacity-100',
                )}
              >
                CRM
              </span>

              <SidebarItem
                href={buildHref('/crm/tasks')}
                label="Tarefas"
                icon={<CheckSquare className="h-4 w-4" />}
              />

              <SidebarItem
                href={buildHref('/crm/pipeline')}
                label="Negociações"
                icon={<Kanban className="h-4 w-4" />}
              ></SidebarItem>
            </div>
            <div>
              <span
                className={cn(
                  'ease-[cubic-bezier(0.25,0.76,0.35,1)] mb-1 block overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 transition-all duration-700',
                  isCollapsed ? 'h-0 opacity-0' : 'h-auto px-3 opacity-100',
                )}
              >
                INBOX
              </span>
              <SidebarItem
                href={buildHref('/inbox')}
                label="Inbox"
                badge="Em breve"
                icon={<Inbox className="h-4 w-4" />}
              />
            </div>
            <div>
              <span
                className={cn(
                  'ease-[cubic-bezier(0.25,0.76,0.35,1)] mb-1 block overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 transition-all duration-700',
                  isCollapsed ? 'h-0 opacity-0' : 'h-auto px-3 opacity-100',
                )}
              >
                AGENTES
              </span>
              <SidebarItem
                href={buildHref('/ai-agent')}
                label="Agentes"
                badge="Em breve"
                icon={<Bot className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Grupos dinâmicos por módulo */}
        </nav>
      </div>

      {/* Footer */}
      <div
        className={cn(
          'overflow-y-auto border-t border-border/50 p-4',
          isCollapsed ? 'px-2' : 'px-4',
        )}
      >
        {footerSlot}
        <nav className="grid gap-2">
          <SidebarItem
            href={buildHref('/settings')}
            label="Configurações"
            icon={<Settings className="h-4 w-4" />}
          />
        </nav>
        <SignOutButton isCollapsed={isCollapsed} />
      </div>
    </aside>
  )
}
