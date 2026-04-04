'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  Megaphone,
  CreditCard,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Shield,
  ClipboardList,
  Palette,
} from 'lucide-react'
import { cn } from '@/_lib/utils'
import { useSidebar } from '@/_providers/sidebar-provider'
import { SignOutButton } from '@/_components/auth/sign-out-button'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

interface AdminNavItemProps {
  href: string
  icon: React.ReactNode
  label: string
}

const AdminNavItem = ({ href, icon, label }: AdminNavItemProps) => {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  const linkContent = (
    <Link
      href={href}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex items-center rounded-md py-2 text-sm font-medium transition-all duration-700 hover:bg-primary/10 hover:text-primary',
        isActive
          ? 'bg-primary/15 text-primary shadow-[0_0_20px_-10px_var(--color-kronos-purple)]'
          : 'text-muted-foreground',
        isCollapsed ? 'ml-2 mr-2 pl-3 pr-0' : 'px-3',
      )}
    >
      <div className="flex items-center">{icon}</div>
      <span
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] overflow-hidden whitespace-nowrap transition-all duration-700',
          isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-auto opacity-100 delay-100',
        )}
      >
        {label}
      </span>
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

export const AdminSidebar = () => {
  const { isCollapsed, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        'relative hidden h-full flex-col border-r border-border/50 bg-sidebar text-sidebar-foreground transition-all duration-500 ease-in-out md:flex',
        isCollapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      {/* Header — branding "DELFOS" */}
      <div
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] flex h-16 items-center border-b border-border/50 transition-[padding] duration-700',
          isCollapsed ? 'pl-6 pr-0' : 'px-6',
        )}
      >
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <Shield className="h-5 w-5 shrink-0 text-primary" />
          <span
            className={cn(
              'ease-[cubic-bezier(0.25,0.76,0.35,1)] overflow-hidden whitespace-nowrap text-xl font-bold tracking-tight transition-all duration-700',
              isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 delay-100',
            )}
          >
            DELFOS
          </span>
        </Link>
      </div>

      {/* Botão flutuante de collapse */}
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

      {/* Label de admin */}
      {!isCollapsed && (
        <div className="border-b border-border/50 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Painel Administrativo
          </span>
        </div>
      )}

      {/* Menu principal */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto py-4',
          isCollapsed ? 'px-2' : 'px-4',
        )}
      >
        <div className="grid gap-1">
          <AdminNavItem
            href="/admin/dashboard"
            label="Dashboard"
            icon={<LayoutDashboard className="h-4 w-4" />}
          />
          <AdminNavItem
            href="/admin/organizations"
            label="Organizações"
            icon={<Building2 className="h-4 w-4" />}
          />
          <AdminNavItem
            href="/admin/users"
            label="Usuários"
            icon={<Users className="h-4 w-4" />}
          />
          <AdminNavItem
            href="/admin/plans"
            label="Planos & Limites"
            icon={<CreditCard className="h-4 w-4" />}
          />
          <AdminNavItem
            href="/admin/announcements"
            label="Comunicados"
            icon={<Megaphone className="h-4 w-4" />}
          />
          <AdminNavItem
            href="/admin/surveys"
            label="Surveys"
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <AdminNavItem
            href="/admin/design-system"
            label="Design System"
            icon={<Palette className="h-4 w-4" />}
          />
        </div>
      </nav>

      {/* Footer — voltar ao CRM + Sair */}
      <div
        className={cn(
          'border-t border-border/50 py-3',
          isCollapsed ? 'px-2' : 'px-4',
        )}
      >
        {/* Voltar para o Hub */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className={cn(
                  'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex cursor-pointer items-center rounded-md py-2 text-sm font-medium text-muted-foreground transition-all duration-500 hover:bg-accent hover:text-accent-foreground ml-2 mr-2 pl-3 pr-0',
                )}
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Voltar para o Hub
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/"
            className="ease-[cubic-bezier(0.25,0.76,0.35,1)] group mb-1 flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-500 hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="ml-3">Voltar para o Hub</span>
          </Link>
        )}

        <SignOutButton isCollapsed={isCollapsed} />
      </div>
    </aside>
  )
}
