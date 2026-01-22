import { ThemeToggle } from '@/_components/theme-toggle'

export const Header = () => {
  return (
    <header className="absolute right-8 top-0 z-50">
      <div className="flex items-center justify-center rounded-b-xl bg-secondary/50 px-1 py-1 transition-all hover:bg-secondary/90">
        <ThemeToggle />
      </div>
    </header>
  )
}
