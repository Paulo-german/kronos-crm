import { AppSidebar } from '@/_components/app-sidebar'
import { Header } from '@/_components/header'
import { Toaster } from 'sonner'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-muted/40">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default AuthenticatedLayout
