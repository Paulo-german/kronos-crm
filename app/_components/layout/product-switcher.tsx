'use client'

import Link from 'next/link'
import { ChevronDown, LayoutGrid, MessageSquare, Bot } from 'lucide-react'
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

type Product = 'crm' | 'inbox' | 'agents'

const PRODUCT_CONFIG: Record<
  Product,
  {
    label: string
    badge: string
    icon: React.ReactNode
    href: (slug: string) => string
    module: ModuleSlug | null
  }
> = {
  crm: {
    label: 'Kronos CRM',
    badge: 'CRM',
    icon: <LayoutGrid className="h-4 w-4" />,
    href: (slug) => `/org/${slug}/crm/home`,
    module: 'crm',
  },
  inbox: {
    label: 'Kronos Inbox',
    badge: 'INBOX',
    icon: <MessageSquare className="h-4 w-4" />,
    href: (slug) => `/org/${slug}/inbox/home`,
    module: 'inbox',
  },
  agents: {
    label: 'Kronos Agents',
    badge: 'AGENTS',
    icon: <Bot className="h-4 w-4" />,
    href: (slug) => `/org/${slug}/agents/home`,
    module: 'ai-agent',
  },
}

interface ProductSwitcherProps {
  orgSlug: string
  currentProduct: Product
  activeModules: ModuleSlug[]
}

export const ProductSwitcher = ({
  orgSlug,
  currentProduct,
  activeModules,
}: ProductSwitcherProps) => {
  const current = PRODUCT_CONFIG[currentProduct]
  const availableProducts = (
    Object.entries(PRODUCT_CONFIG) as [
      Product,
      (typeof PRODUCT_CONFIG)[Product],
    ][]
  ).filter(
    ([, config]) =>
      config.module === null || activeModules.includes(config.module),
  )

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
          <span className="hidden rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-primary md:inline">
            {current.badge}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white/50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        alignOffset={100}
        sideOffset={16}
        className="w-64 rounded-2xl border-0 bg-primary-dark p-2 text-white [--accent-foreground:0_0%_100%] [--accent:0_0%_100%_/_0.10]"
      >
        <DropdownMenuLabel className="px-2 py-2 text-xs font-medium uppercase tracking-wider text-white/40">
          Produtos
        </DropdownMenuLabel>
        {availableProducts.map(([key, config]) => (
          <DropdownMenuItem key={key} asChild>
            <Link href={config.href(orgSlug)} className="cursor-pointer py-2.5">
              <span className="mr-3 flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10">
                {config.icon}
              </span>
              {config.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem disabled className="py-2.5 text-white/30">
          <span className="mr-3 flex size-7 shrink-0 items-center justify-center rounded-md bg-white/5">
            <LayoutGrid className="h-4 w-4" />
          </span>
          Kronos Account (em breve)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
