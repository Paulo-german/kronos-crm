import { Home, Users, Kanban, CheckSquare, CalendarClock, BarChart3 } from 'lucide-react'
import { NavItem } from '@/_components/layout/sidebars/nav-item'

interface CrmSidebarProps {
  orgSlug: string
}

export const CrmSidebar = ({ orgSlug }: CrmSidebarProps) => {
  const base = `/org/${orgSlug}/crm`

  return (
    <aside className="group/sidebar relative hidden h-full w-[60px] flex-col overflow-hidden border-r border-border/50 bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out hover:w-60 md:flex">
      <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
        <NavItem href={`${base}/home`} icon={<Home className="h-4 w-4" />} label="Início" />
        <NavItem href={`${base}/contacts`} icon={<Users className="h-4 w-4" />} label="Contatos" />

        <div className="my-1 h-px bg-border/50" />

        <NavItem href={`${base}/deals`} icon={<Kanban className="h-4 w-4" />} label="Negociações" />
        <NavItem href={`${base}/tasks`} icon={<CheckSquare className="h-4 w-4" />} label="Tarefas" />
        <NavItem href={`${base}/appointments`} icon={<CalendarClock className="h-4 w-4" />} label="Agendamentos" />

        <div className="mt-auto pt-4">
          <div className="mb-1 h-px bg-border/50" />
          <NavItem href={`${base}/reports/overview`} icon={<BarChart3 className="h-4 w-4" />} label="Analisar" />
        </div>
      </nav>
    </aside>
  )
}
