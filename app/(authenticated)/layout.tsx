import { AppSidebar } from '@/_components/app-sidebar'
import { Header } from '@/_components/header'
import { Toaster } from '@/_components/ui/sonner'
import { ContentWrapper } from './_components/content-wrapper'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ContentWrapper>{children}</ContentWrapper>
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}

export default AuthenticatedLayout
