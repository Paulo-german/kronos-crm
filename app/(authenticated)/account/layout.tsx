import { redirect } from 'next/navigation'
import { createClient } from '@/_lib/supabase/server'
import { getUserById } from '@/_data-access/user/get-user-by-id'
import { AccountTopBar } from '@/_components/layout/account-top-bar'

interface AccountLayoutProps {
  children: React.ReactNode
}

const AccountLayout = async ({ children }: AccountLayoutProps) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userData = await getUserById(user.id)

  const topBarUser = {
    fullName: userData?.fullName ?? null,
    email: userData?.email ?? user.email ?? '',
    avatarUrl: userData?.avatarUrl ?? null,
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <AccountTopBar user={topBarUser} />
      <main className="flex flex-1 items-start justify-center overflow-y-auto py-10">
        <div className="w-full max-w-2xl px-4">{children}</div>
      </main>
    </div>
  )
}

export default AccountLayout
