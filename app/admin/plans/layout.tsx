import { redirect } from 'next/navigation'
import { isCurrentUserOwner } from '@/_lib/auth/is-owner'

interface PlansLayoutProps {
  children: React.ReactNode
}

export default async function PlansLayout({ children }: PlansLayoutProps) {
  const isOwner = await isCurrentUserOwner()

  if (!isOwner) {
    redirect('/admin/dashboard')
  }

  return <>{children}</>
}
