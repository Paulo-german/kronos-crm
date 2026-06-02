'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Home, Users, Kanban, CheckSquare, CalendarClock, BarChart3, MessageSquare, Bot, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/_components/ui/sheet'
import { cn } from '@/_lib/utils'

type Product = 'crm' | 'inbox' | 'agents'

interface DrawerNavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  onNavigate: () => void
}

const DrawerNavItem = ({ href, icon, label, onNavigate }: DrawerNavItemProps) => {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
      )}
    >
      <div className="shrink-0">{icon}</div>
      <span>{label}</span>
    </Link>
  )
}

interface ProductMobileDrawerProps {
  product: Product
  orgSlug: string
}

export const ProductMobileDrawer = ({ product, orgSlug }: ProductMobileDrawerProps) => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const close = () => setOpen(false)

  const navItems = {
    crm: (
      <>
        <DrawerNavItem href={`/org/${orgSlug}/crm/home`} icon={<Home className="h-4 w-4" />} label="Início" onNavigate={close} />
        <DrawerNavItem href={`/org/${orgSlug}/crm/contacts`} icon={<Users className="h-4 w-4" />} label="Contatos" onNavigate={close} />
        <div className="my-1 h-px bg-border/50 mx-3" />
        <DrawerNavItem href={`/org/${orgSlug}/crm/deals`} icon={<Kanban className="h-4 w-4" />} label="Negociações" onNavigate={close} />
        <DrawerNavItem href={`/org/${orgSlug}/crm/tasks`} icon={<CheckSquare className="h-4 w-4" />} label="Tarefas" onNavigate={close} />
        <DrawerNavItem href={`/org/${orgSlug}/crm/appointments`} icon={<CalendarClock className="h-4 w-4" />} label="Agendamentos" onNavigate={close} />
        <div className="my-1 h-px bg-border/50 mx-3" />
        <DrawerNavItem href={`/org/${orgSlug}/crm/reports/overview`} icon={<BarChart3 className="h-4 w-4" />} label="Analisar" onNavigate={close} />
      </>
    ),
    inbox: (
      <>
        <DrawerNavItem href={`/org/${orgSlug}/inbox/home`} icon={<Home className="h-4 w-4" />} label="Início" onNavigate={close} />
        <DrawerNavItem href={`/org/${orgSlug}/inbox/contacts`} icon={<Users className="h-4 w-4" />} label="Contatos" onNavigate={close} />
        <div className="my-1 h-px bg-border/50 mx-3" />
        <DrawerNavItem href={`/org/${orgSlug}/inbox`} icon={<MessageSquare className="h-4 w-4" />} label="Conversas" onNavigate={close} />
        <div className="my-1 h-px bg-border/50 mx-3" />
        <DrawerNavItem href={`/org/${orgSlug}/inbox/reports`} icon={<BarChart3 className="h-4 w-4" />} label="Analisar" onNavigate={close} />
      </>
    ),
    agents: (
      <>
        <DrawerNavItem href={`/org/${orgSlug}/agents/home`} icon={<Home className="h-4 w-4" />} label="Início" onNavigate={close} />
        <DrawerNavItem href={`/org/${orgSlug}/agents/contacts`} icon={<Users className="h-4 w-4" />} label="Contatos" onNavigate={close} />
        <div className="my-1 h-px bg-border/50 mx-3" />
        <DrawerNavItem href={`/org/${orgSlug}/agents/ai-agent`} icon={<Bot className="h-4 w-4" />} label="Agentes" onNavigate={close} />
        <DrawerNavItem href={`/org/${orgSlug}/agents/ai-agent/groups`} icon={<FolderOpen className="h-4 w-4" />} label="Grupos" onNavigate={close} />
        <div className="my-1 h-px bg-border/50 mx-3" />
        <DrawerNavItem href={`/org/${orgSlug}/agents/reports`} icon={<BarChart3 className="h-4 w-4" />} label="Analisar" onNavigate={close} />
      </>
    ),
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu de navegação"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 p-0 [&>button:first-child]:hidden">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <nav className="flex flex-col gap-1 px-2 py-4">
            {navItems[product]}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
