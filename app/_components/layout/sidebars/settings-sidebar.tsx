'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Users,
  Plug,
  CreditCard,
  Shield,
  Map,
  Gift,
  BookMarked,
} from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Badge } from '@/_components/ui/badge'

interface SettingsSidebarProps {
  orgSlug: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  disabled?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

export function SettingsSidebar({ orgSlug }: SettingsSidebarProps) {
  const pathname = usePathname()

  const sections: NavSection[] = [
    {
      title: 'Organização',
      items: [
        {
          label: 'Dados da Empresa',
          href: `/org/${orgSlug}/settings/organization`,
          icon: <Building2 className="h-4 w-4" />,
        },
        {
          label: 'Membros e Equipes',
          href: `/org/${orgSlug}/settings/members`,
          icon: <Users className="h-4 w-4" />,
        },
        {
          label: 'Integrações',
          href: `/org/${orgSlug}/settings/integrations`,
          icon: <Plug className="h-4 w-4" />,
        },
        {
          label: 'Planos de Sucesso',
          href: `/org/${orgSlug}/settings/success-plans`,
          icon: <BookMarked className="h-4 w-4" />,
          disabled: true,
        },
      ],
    },
    {
      title: 'Financeiro',
      items: [
        {
          label: 'Plano e Faturamento',
          href: `/org/${orgSlug}/settings/billing`,
          icon: <CreditCard className="h-4 w-4" />,
        },
      ],
    },
    {
      title: 'Conta',
      items: [
        {
          label: 'Segurança',
          href: `/org/${orgSlug}/settings/security`,
          icon: <Shield className="h-4 w-4" />,
          disabled: true,
        },
        {
          label: 'Minha Jornada',
          href: `/org/${orgSlug}/settings/my-journey`,
          icon: <Map className="h-4 w-4" />,
          disabled: true,
        },
        {
          label: 'Indique e Ganhe',
          href: `/org/${orgSlug}/settings/referral`,
          icon: <Gift className="h-4 w-4" />,
          disabled: true,
        },
      ],
    },
  ]

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/50 bg-sidebar text-sidebar-foreground md:flex">
      <nav className="flex flex-col gap-6 px-3 py-6">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <span className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.title}
            </span>
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/')

              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    className="flex cursor-not-allowed items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium opacity-50"
                  >
                    <span className="h-4 w-4 shrink-0">{item.icon}</span>
                    {item.label}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Em breve
                    </Badge>
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <span className="h-4 w-4 shrink-0">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
