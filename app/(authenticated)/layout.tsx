import { cookies } from 'next/headers'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { SidebarProvider } from '@/_providers/sidebar-provider'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

const AuthenticatedLayout = async ({ children }: AuthenticatedLayoutProps) => {
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get('kronos-sidebar-collapsed')
  const defaultCollapsed = sidebarCookie?.value === 'true'

  return (
    <SidebarProvider defaultCollapsed={defaultCollapsed}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </SidebarProvider>
  )
}

export default AuthenticatedLayout
