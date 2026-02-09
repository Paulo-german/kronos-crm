import { AppSidebar } from '@/_components/layout/app-sidebar'
import { Header } from '@/_components/layout/header'
import { ContentWrapper } from '@/(authenticated)/_components/content-wrapper'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ContentWrapper>{children}</ContentWrapper>
      </div>
    </div>
  )
}

export default MainLayout
