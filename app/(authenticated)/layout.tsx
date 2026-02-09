import { Toaster } from '@/_components/ui/sonner'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { SidebarProvider } from '@/_providers/sidebar-provider'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  return (
    <SidebarProvider>
      <TooltipProvider>
        {children}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </SidebarProvider>
  )
}

export default AuthenticatedLayout
