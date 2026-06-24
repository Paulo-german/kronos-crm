import { Home, Users, MessageSquare, BarChart3, Inbox } from 'lucide-react'
import { NavItem } from '@/_components/layout/sidebars/nav-item'

interface InboxSidebarProps {
  orgSlug: string
}

export const InboxSidebar = ({ orgSlug }: InboxSidebarProps) => {
  const base = `/org/${orgSlug}`

  return (
    <aside className="group/sidebar relative hidden h-full w-16 flex-col overflow-hidden bg-primary-dark text-white transition-[width] duration-300 ease-in-out hover:w-60 md:flex">
      <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
        <NavItem
          href={`${base}/inbox/home`}
          icon={<Home className="h-4 w-4" />}
          label="Início"
        />
        <NavItem
          href={`${base}/inbox/contacts`}
          icon={<Users className="h-4 w-4" />}
          label="Contatos"
        />
        <NavItem
          href={`${base}/inbox/reports`}
          icon={<BarChart3 className="h-4 w-4" />}
          label="Analisar"
        />

        <div className="my-1 h-px bg-white/10 dark:bg-border/50" />

        <NavItem
          href={`${base}/inbox`}
          icon={<MessageSquare className="h-4 w-4" />}
          label="Conversas"
          exact
        />
        <NavItem
          href={`${base}/inbox/settings/inboxes`}
          icon={<Inbox className="h-4 w-4" />}
          label="Caixas de Entrada"
        />
      </nav>
    </aside>
  )
}
