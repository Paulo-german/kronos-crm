import { TooltipProvider } from '@/_components/ui/tooltip'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  return <TooltipProvider>{children}</TooltipProvider>
}

export default AuthenticatedLayout
