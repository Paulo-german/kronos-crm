import { ThemeToggle } from '@/_components/theme-toggle'
import { GlobalSearch } from '@/_components/global-search'

const HeaderStick = () => {
  return (
    <header className="absolute right-8 top-0 z-50">
      <div className="flex items-center justify-center gap-1 rounded-b-xl bg-secondary/50 px-1 py-1 transition-all hover:bg-secondary/90">
        <GlobalSearch />
        <ThemeToggle />
      </div>
    </header>
  )
}

export default HeaderStick
