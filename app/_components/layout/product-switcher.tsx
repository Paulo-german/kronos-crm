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
  { label: string; icon: React.ReactNode; href: (slug: string) => string; module: ModuleSlug | null }
> = {
  crm: {
    label: 'Kronos CRM',
    icon: <LayoutGrid className="h-4 w-4" />,
    href: (slug) => `/org/${slug}/crm/home`,
    module: 'crm',
  },
  inbox: {
    label: 'Kronos Inbox',
    icon: <MessageSquare className="h-4 w-4" />,
    href: (slug) => `/org/${slug}/inbox/home`,
    module: 'inbox',
  },
  agents: {
    label: 'Kronos Agents',
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

export const ProductSwitcher = ({ orgSlug, currentProduct, activeModules }: ProductSwitcherProps) => {
  const current = PRODUCT_CONFIG[currentProduct]
  const availableProducts = (Object.entries(PRODUCT_CONFIG) as [Product, (typeof PRODUCT_CONFIG)[Product]][]).filter(
    ([, config]) => config.module === null || activeModules.includes(config.module),
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2 font-semibold hover:bg-primary/10">
          <KronosLogo className="h-4 w-4 text-primary" />
          <span className="hidden text-sm md:inline">{current.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Produtos
        </DropdownMenuLabel>
        {availableProducts.map(([key, config]) => (
          <DropdownMenuItem key={key} asChild>
            <Link
              href={config.href(orgSlug)}
              className="flex items-center gap-2"
            >
              {config.icon}
              {config.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-muted-foreground/50">
          Kronos Account (em breve)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
