import { AppSidebar } from '@/_components/app-sidebar'
import { Header } from '@/_components/header'
import { Toaster } from 'sonner'
import { ContentWrapper } from './_components/content-wrapper'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-muted/40">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ContentWrapper>{children}</ContentWrapper>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default AuthenticatedLayout
