import { ProductSwitcher } from '@/_components/layout/product-switcher'
import { SecondaryMenu } from '@/_components/layout/secondary-menu'
import { AccountMenu } from '@/_components/layout/account-menu'
import { ProductMobileDrawer } from '@/_components/layout/product-mobile-drawer'
import type { NotificationDto } from '@/_data-access/notification/types'
import type { ModuleSlug } from '@/_data-access/module/types'

type Product = 'crm' | 'inbox' | 'agents'

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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-background px-3">
      <div className="flex items-center gap-1">
        <ProductMobileDrawer product={product} orgSlug={orgSlug} />
        <ProductSwitcher
          orgSlug={orgSlug}
          currentProduct={product}
          activeModules={activeModules}
        />
      </div>

      <SecondaryMenu
        product={product}
        orgSlug={orgSlug}
        initialUnreadCount={initialUnreadCount}
        initialNotifications={initialNotifications}
        completedTutorialIds={completedTutorialIds}
        isSuperAdmin={isSuperAdmin}
        credits={credits}
      />

      <AccountMenu user={user} orgSlug={orgSlug} />
    </header>
  )
}
