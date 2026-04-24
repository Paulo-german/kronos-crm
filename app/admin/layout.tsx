import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { db } from '@/_lib/prisma'
import { SidebarProvider } from '@/_providers/sidebar-provider'
import { AdminSidebar } from './_components/admin-sidebar'
import { AdminTopBar } from './_components/admin-top-bar'
import { cookies } from 'next/headers'
import { isCurrentUserOwner } from '@/_lib/auth/is-owner'

interface AdminLayoutProps {
  children: React.ReactNode
}

const AdminLayout = async ({ children }: AdminLayoutProps) => {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const user = await db.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      isSuperAdmin: true,
    },
  })

  if (!user?.isSuperAdmin) {
    redirect('/')
  }

  const [cookieStore, isOwner] = await Promise.all([
    cookies(),
    isCurrentUserOwner(),
  ])
  const sidebarCollapsed = cookieStore.get('kronos-sidebar-collapsed')?.value === 'true'

  return (
    <SidebarProvider defaultCollapsed={sidebarCollapsed}>
      <div className="flex h-dvh w-full bg-background">
        <AdminSidebar isOwner={isOwner} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AdminTopBar user={user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default AdminLayout
