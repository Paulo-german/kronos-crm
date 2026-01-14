import { SignOutButton } from '@/_components/auth/sign-out-button'
import { ThemeToggle } from '@/_components/theme-toggle'

export const Header = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-background/50 px-6 backdrop-blur-md transition-all">
      <div className="flex items-center gap-4">
        {/* Placeholder for Breadcrumbs or Page Title */}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  )
}
