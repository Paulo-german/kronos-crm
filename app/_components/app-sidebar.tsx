'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Package,
  Settings,
} from 'lucide-react'
import { SidebarItem } from './sidebar-item'
import { KronosLogo } from './icons/kronos-logo'
import { SignOutButton } from './auth/sign-out-button'

export const AppSidebar = () => {
  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-border/50 bg-secondary/20 text-card-foreground md:flex">
      <div className="flex h-16 items-center border-b border-border/50 px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <KronosLogo />
          <span className="text-xl font-bold tracking-tight">KRONOS</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-4">
          {/* <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p> */}

          <SidebarItem href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </SidebarItem>

          <SidebarItem href="/contacts">
            <Users className="h-4 w-4" />
            Contatos
          </SidebarItem>

          <SidebarItem href="/products">
            <Package className="h-4 w-4" />
            Produtos
          </SidebarItem>

          <SidebarItem href="/tasks">
            <CheckSquare className="h-4 w-4" />
            Tarefas
          </SidebarItem>

          <SidebarItem href="/pipeline">
            <Kanban className="h-4 w-4" />
            Pipeline
          </SidebarItem>
        </nav>
      </div>
      <div className="border-t border-border/50 p-4">
        <nav className="grid gap-2">
          <SidebarItem href="/settings">
            <Settings className="h-4 w-4" />
            Configurações
          </SidebarItem>
        </nav>
        <SignOutButton />
      </div>
    </aside>
  )
}
