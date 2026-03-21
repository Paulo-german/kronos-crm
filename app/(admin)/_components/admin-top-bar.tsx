import { ThemeToggle } from '@/_components/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'

interface AdminTopBarProps {
  user: {
    fullName: string | null
    email: string
    avatarUrl: string | null
  }
}

function getInitials(fullName: string | null, email: string): string {
  const name = fullName ?? email
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const AdminTopBar = ({ user }: AdminTopBarProps) => {
  const initials = getInitials(user.fullName, user.email)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background px-4">
      <div />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Avatar className="size-8">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? user.email} />
          <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
