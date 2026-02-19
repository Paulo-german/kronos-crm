import { ThemeToggle } from '@/_components/theme-toggle'
import { GlobalSearch } from '@/_components/global-search'
import { RevalidateCacheButton } from '@/_components/layout/revalidate-cache-button'

const DEV_EMAIL = 'paulo.roriz01@gmail.com'

interface HeaderStickProps {
  userEmail?: string | null
}

const HeaderStick = ({ userEmail }: HeaderStickProps) => {
  return (
    <header className="absolute right-8 top-0 z-50">
      <div className="flex items-center justify-center gap-1 rounded-b-xl bg-secondary/50 px-1 py-1 transition-all hover:bg-secondary/90">
        {userEmail === DEV_EMAIL && <RevalidateCacheButton />}
        <GlobalSearch />
        <ThemeToggle />
      </div>
    </header>
  )
}

export default HeaderStick
