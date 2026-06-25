import { ProductSwitcher } from '@/_components/layout/product-switcher'
import { SecondaryMenu } from '@/_components/layout/secondary-menu'
import { AccountMenu } from '@/_components/layout/account-menu'
import { ProductMobileDrawer } from '@/_components/layout/product-mobile-drawer'
import { GlobalSearch } from '@/_components/global-search'
import type { NotificationDto } from '@/_data-access/notification/types'
import type { ModuleSlug } from '@/_data-access/module/types'

type Product = 'crm' | 'inbox' | 'agents' | 'prospection'

interface ProductTopBarProps {
  product: Product
  orgSlug: string
  user: {
    fullName: string | null
    email: string
    avatarUrl: string | null
  }
  activeModules: ModuleSlug[]
  initialUnreadCount: number
  initialNotifications: NotificationDto[]
  completedTutorialIds: string[]
  isSuperAdmin: boolean
  credits?: {
    available: number
    monthlyLimit: number
  }
}

export const ProductTopBar = ({
  product,
  orgSlug,
  user,
  activeModules,
  initialUnreadCount,
  initialNotifications,
  completedTutorialIds,
  isSuperAdmin,
  credits,
}: ProductTopBarProps) => {
  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between bg-primary-dark px-3 text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
      <div className="flex items-center gap-1">
        <ProductMobileDrawer product={product} orgSlug={orgSlug} />
        <ProductSwitcher
          orgSlug={orgSlug}
          currentProduct={product}
          activeModules={activeModules}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      {product === 'crm' && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <GlobalSearch />
        </div>
      )}

      <div className="flex items-center">
        <SecondaryMenu
          product={product}
          orgSlug={orgSlug}
          initialUnreadCount={initialUnreadCount}
          initialNotifications={initialNotifications}
          completedTutorialIds={completedTutorialIds}
          isSuperAdmin={isSuperAdmin}
          credits={credits}
        />
        <div className="mx-1 h-5 w-px bg-white/20 dark:bg-border/50" />
        <AccountMenu user={user} orgSlug={orgSlug} />
      </div>
    </header>
  )
}
