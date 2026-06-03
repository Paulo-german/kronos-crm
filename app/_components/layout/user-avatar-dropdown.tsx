'use client'

import Link from 'next/link'
import { User, Bell, LogOut } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { signOut } from '@/_actions/auth/sign-out'

interface UserAvatarDropdownProps {
  user: {
    fullName: string | null
    email: string
    avatarUrl: string | null
  }
  orgSlug?: string
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
  const { execute: executeSignOut } = useAction(signOut)

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

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-72 border-0 bg-primary-dark p-2 text-white [--accent:0_0%_100%_/_0.10] [--accent-foreground:0_0%_100%]"
      >
        <DropdownMenuLabel className="px-2 py-3 font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? user.email} />
              <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {user.fullName ?? 'Usuário'}
              </p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem asChild>
          <Link href="/account/profile" className="cursor-pointer py-2.5">
            <User className="mr-2 size-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>

        {orgSlug && (
          <DropdownMenuItem asChild>
            <Link href={`/org/${orgSlug}/notifications/preferences`} className="cursor-pointer py-2.5">
              <Bell className="mr-2 size-4" />
              Notificações
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          className="cursor-pointer py-2.5 text-destructive focus:text-destructive"
          onClick={() => executeSignOut()}
        >
          <LogOut className="mr-2 size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
