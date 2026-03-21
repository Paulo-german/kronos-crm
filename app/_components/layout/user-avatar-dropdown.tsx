'use client'

import Link from 'next/link'
import { User, Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'

interface UserAvatarDropdownProps {
  user: {
    fullName: string | null
    email: string
    avatarUrl: string | null
  }
  orgSlug: string
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

export const UserAvatarDropdown = ({ user, orgSlug }: UserAvatarDropdownProps) => {
  const initials = getInitials(user.fullName, user.email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Avatar className="size-8 cursor-pointer transition-opacity hover:opacity-80">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? user.email} />
            <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.fullName ?? 'Usuário'}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={`/org/${orgSlug}/settings/profile`} className="cursor-pointer">
            <User className="mr-2 size-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={`/org/${orgSlug}/notifications/preferences`} className="cursor-pointer">
            <Bell className="mr-2 size-4" />
            Notificações
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
