'use client'

import Link from 'next/link'
import { Settings2, Radio, Zap, Shield } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { NotificationBell } from '@/_components/layout/notification-bell'
import { TutorialsPopoverButton } from '@/_components/layout/tutorials-popover-button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import type { NotificationDto } from '@/_data-access/notification/types'

type Product = 'crm' | 'inbox' | 'agents' | 'prospection'

interface SecondaryMenuProps {
  product: Product
  orgSlug: string
  initialUnreadCount: number
  initialNotifications: NotificationDto[]
  completedTutorialIds: string[]
  isSuperAdmin: boolean
  credits?: {
    available: number
    monthlyLimit: number
  }
}

const PRODUCT_SETTINGS_HREF: Record<Product, (slug: string) => string> = {
  crm: (slug) => `/org/${slug}/crm/settings`,
  inbox: (slug) => `/org/${slug}/inbox/settings`,
  agents: (slug) => `/org/${slug}/agents/settings`,
  prospection: (slug) => `/org/${slug}/prospection/settings`,
}

const PRODUCT_NOTIFICATIONS_HREF: Record<Product, (slug: string) => string> = {
  crm: (slug) => `/org/${slug}/crm/notifications`,
  inbox: (slug) => `/org/${slug}/inbox/notifications`,
  agents: (slug) => `/org/${slug}/agents/notifications`,
  prospection: (slug) => `/org/${slug}/prospection/notifications`,
}

export const SecondaryMenu = ({
  product,
  orgSlug,
  initialUnreadCount,
  initialNotifications,
  completedTutorialIds,
  isSuperAdmin,
  credits,
}: SecondaryMenuProps) => {
  const settingsHref = PRODUCT_SETTINGS_HREF[product](orgSlug)
  const notificationsHref = PRODUCT_NOTIFICATIONS_HREF[product](orgSlug)

  return (
    <div className="flex items-center gap-0.5">
      {/* Canais — apenas Inbox */}
      {product === 'inbox' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href={`/org/${orgSlug}/inbox/settings/inboxes`}>
                <Radio className="size-4" />
                <span className="sr-only">Canais</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Canais</TooltipContent>
        </Tooltip>
      )}

      {/* Créditos IA — apenas Agents */}
      {product === 'agents' && credits && credits.monthlyLimit > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href={`/org/${orgSlug}/agents/settings/credits`}>
                <Zap className="size-4" />
                <span className="sr-only">Créditos IA</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Créditos IA: {credits.available.toLocaleString('pt-BR')} /{' '}
            {credits.monthlyLimit.toLocaleString('pt-BR')}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Tutoriais */}
      <TutorialsPopoverButton
        completedTutorialIds={completedTutorialIds}
        orgSlug={orgSlug}
      />

      {/* Notificações */}
      <NotificationBell
        orgSlug={orgSlug}
        initialUnreadCount={initialUnreadCount}
        initialNotifications={initialNotifications}
        notificationsHref={notificationsHref}
      />

      {/* Configurações do produto */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href={settingsHref}>
              <Settings2 className="size-4" />
              <span className="sr-only">Configurações</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Configurações</TooltipContent>
      </Tooltip>

      {/* Admin — apenas superAdmin */}
      {isSuperAdmin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/admin/dashboard">
                <Shield className="size-4" />
                <span className="sr-only">Admin</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delfos Admin</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
