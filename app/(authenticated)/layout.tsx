import { AppSidebar } from '@/_components/layout/app-sidebar'
import { Header } from '@/_components/layout/header'
import { Toaster } from '@/_components/ui/sonner'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { SidebarProvider } from '@/_providers/sidebar-provider'
import { ContentWrapper } from './_components/content-wrapper'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="flex h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <ContentWrapper>{children}</ContentWrapper>
          </div>
          <Toaster position="bottom-right" />
        </div>
      </TooltipProvider>
    </SidebarProvider>
  )
}

export default AuthenticatedLayout
