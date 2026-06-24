'use client'

import Link from 'next/link'
import {
  ChevronDown,
  PanelsTopLeft,
  MessageSquare,
  Bot,
  Telescope,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { Button } from '@/_components/ui/button'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import type { ModuleSlug } from '@/_data-access/module/types'

type Product = 'crm' | 'inbox' | 'agents' | 'prospection'

const PRODUCT_CONFIG: Record<
  Product,
  {
    label: string
    badge: string
    badgeClass: string
    icon: React.ReactNode
    iconClass: string
    href: (slug: string) => string
    module: ModuleSlug | null
  }
> = {
  crm: {
    label: 'Kronos Crm',
    badge: 'CRM',
    badgeClass: 'bg-kronos-cyan/15 text-kronos-cyan',
    icon: <PanelsTopLeft className="h-4 w-4" />,
    iconClass: 'bg-kronos-cyan/20 text-kronos-cyan',
    href: (slug) => `/org/${slug}/crm/home`,
    module: 'crm',
  },
  inbox: {
    label: 'Kronos Inbox',
    badge: 'INBOX',
    badgeClass: 'bg-kronos-green/15 text-kronos-green',
    icon: <MessageSquare className="h-4 w-4" />,
    iconClass: 'bg-kronos-green/20 text-kronos-green',
    href: (slug) => `/org/${slug}/inbox/home`,
    module: 'inbox',
  },
  agents: {
    label: 'Kronos Agents',
    badge: 'AGENTS',
    badgeClass: 'bg-kronos-purple/15 text-kronos-purple',
    icon: <Bot className="h-4 w-4" />,
    iconClass: 'bg-kronos-purple/20 text-kronos-purple',
    href: (slug) => `/org/${slug}/agents/home`,
    module: 'ai-agent',
  },
  prospection: {
    label: 'Kronos Prospection',
    badge: 'PROSPECTION',
    badgeClass: 'bg-kronos-orange/15 text-kronos-orange',
    icon: <Telescope className="h-4 w-4" />,
    iconClass: 'bg-kronos-orange/20 text-kronos-orange',
    href: (slug) => `/org/${slug}/prospection/home`,
    module: 'prospection',
  },
}

interface ProductSwitcherProps {
  orgSlug: string
  currentProduct: Product
  activeModules: ModuleSlug[]
  isSuperAdmin: boolean
}

export const ProductSwitcher = ({
  orgSlug,
  currentProduct,
  activeModules,
  isSuperAdmin,
}: ProductSwitcherProps) => {
  const current = PRODUCT_CONFIG[currentProduct]
  // Prospection ainda não está liberado: clicável só para superadmin; os demais
  // veem "EM BREVE". Os outros produtos seguem o gating normal por módulo.
  const availableProducts = (
    Object.entries(PRODUCT_CONFIG) as [
      Product,
      (typeof PRODUCT_CONFIG)[Product],
    ][]
  ).filter(([key, config]) => {
    if (key === 'prospection') return isSuperAdmin
    return config.module === null || activeModules.includes(config.module)
  })
  const showProspectionSoon = !isSuperAdmin

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 hover:text-white"
        >
          <KronosLogo className="h-5 w-5 text-white" />
          <span className="hidden text-base font-bold tracking-tight md:inline">
            KRONOS
          </span>
          <span
            className={`hidden rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide md:inline ${current.badgeClass}`}
          >
            {current.badge}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        alignOffset={100}
        sideOffset={16}
        className="w-72 rounded-2xl border-0 bg-primary-dark p-2 text-white [--accent-foreground:0_0%_100%] [--accent:0_0%_100%_/_0.10]"
      >
        <DropdownMenuLabel className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-white/40">
          Produtos
        </DropdownMenuLabel>
        {availableProducts.map(([key, config]) => (
          <DropdownMenuItem key={key} asChild>
            <Link href={config.href(orgSlug)} className="cursor-pointer py-2.5">
              <span
                className={`mr-3 flex size-7 shrink-0 items-center justify-center rounded-md ${config.iconClass}`}
              >
                {config.icon}
              </span>
              {config.label}
            </Link>
          </DropdownMenuItem>
        ))}
        {showProspectionSoon && (
          <DropdownMenuItem className="pointer-events-none cursor-default py-2.5 text-white">
            <span
              className={`mr-3 flex size-7 shrink-0 items-center justify-center rounded-md ${PRODUCT_CONFIG.prospection.iconClass}`}
            >
              {PRODUCT_CONFIG.prospection.icon}
            </span>
            {PRODUCT_CONFIG.prospection.label}
            <span className="ml-auto rounded bg-kronos-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-kronos-cyan">
              EM BREVE
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem className="pointer-events-none cursor-default py-2.5 text-white">
          <span className="mr-3 flex size-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-white">
            <KronosLogo className="h-4 w-4" />
          </span>
          Kronos Hub
          <span className="ml-auto rounded bg-kronos-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-kronos-cyan">
            EM BREVE
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
