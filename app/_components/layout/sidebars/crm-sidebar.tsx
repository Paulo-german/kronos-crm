import { Home, Users, Kanban, CheckSquare, CalendarClock, BarChart3 } from 'lucide-react'
import { NavItem } from '@/_components/layout/sidebars/nav-item'

interface CrmSidebarProps {
  orgSlug: string
}

export const CrmSidebar = ({ orgSlug }: CrmSidebarProps) => {
  const base = `/org/${orgSlug}/crm`

  return (
    <aside className="group/sidebar relative hidden h-full w-16 flex-col overflow-hidden bg-primary-dark text-white transition-[width] duration-300 ease-in-out hover:w-60 md:flex">
      <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
        <NavItem href={`${base}/home`} icon={<Home className="h-4 w-4" />} label="Início" />
        <NavItem href={`${base}/contacts`} icon={<Users className="h-4 w-4" />} label="Contatos" />
        <NavItem href={`${base}/reports/overview`} icon={<BarChart3 className="h-4 w-4" />} label="Analisar" />

        <div className="my-1 h-px bg-white/10 dark:bg-border/50" />

        <NavItem href={`${base}/deals`} icon={<Kanban className="h-4 w-4" />} label="Negociações" />
        <NavItem href={`${base}/tasks`} icon={<CheckSquare className="h-4 w-4" />} label="Tarefas" />
        <NavItem href={`${base}/appointments`} icon={<CalendarClock className="h-4 w-4" />} label="Agendamentos" />
      </nav>
    </aside>
  )
}
