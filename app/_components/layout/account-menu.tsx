'use client'

import Link from 'next/link'
import {
  ChevronDown,
  Building2,
  CreditCard,
  LayoutGrid,
  Plug,
  User,
  LogOut,
  ArrowLeftRight,
  Copy,
  Check,
  Users,
} from 'lucide-react'
import { useState, useCallback } from 'react'
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
import { useOrganization } from '@/_providers/organization-provider'
import { signOut } from '@/_actions/auth/sign-out'

interface AccountMenuProps {
  user: {
    fullName: string | null
    email: string
    avatarUrl: string | null
  }
  orgSlug: string
}

function getInitials(name: string | null, email: string): string {
  const source = name ?? email
  return source
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getOrgInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export const AccountMenu = ({ user, orgSlug }: AccountMenuProps) => {
  const { organization } = useOrganization()
  const [copied, setCopied] = useState(false)
  const { execute: executeSignOut } = useAction(signOut)

  const storeSettingsOrigin = useCallback(() => {
    if (!window.location.pathname.includes('/settings')) {
      sessionStorage.setItem('settings-origin', window.location.pathname)
    }
  }, [])

  const handleCopyId = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      await navigator.clipboard.writeText(organization.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    },
    [organization.id],
  )

  const userInitials = getInitials(user.fullName, user.email)
  const orgInitials = getOrgInitials(organization.name)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/20 text-[9px] font-bold text-primary ring-1 ring-primary/20">
            {orgInitials}
          </div>
          <span className="hidden max-w-[120px] truncate md:block">
            {organization.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={16}
        className="w-72 rounded-2xl border-0 bg-primary-dark p-2 text-white [--accent-foreground:0_0%_100%] [--accent:0_0%_100%_/_0.10]"
      >
        {/* Seção Org */}
        <DropdownMenuLabel className="px-2 py-3 font-normal">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/20 text-sm font-bold text-primary ring-1 ring-primary/20">
              {orgInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {organization.name}
              </p>
              <div className="mt-0.5 flex items-center gap-1">
                <p className="truncate text-xs text-white/50">
                  {organization.slug}
                </p>
                <span className="text-white/20">·</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-0.5 text-[10px] text-white/40 transition-colors hover:text-white/70"
                  title="Copiar ID da org"
                >
                  {copied ? (
                    <Check className="h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                  <span className="font-mono">
                    {organization.id.slice(0, 8)}…
                  </span>
                </button>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem asChild>
          <Link
            href={`/org/${orgSlug}/settings/organization`}
            className="cursor-pointer py-2.5"
            onClick={storeSettingsOrigin}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Conta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`/org/${orgSlug}/settings/members`}
            className="cursor-pointer py-2.5"
            onClick={storeSettingsOrigin}
          >
            <Users className="mr-2 h-4 w-4" />
            Membros e Equipes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`/org/${orgSlug}/settings/billing`}
            className="cursor-pointer py-2.5"
            onClick={storeSettingsOrigin}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Painel financeiro
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`/org/${orgSlug}/plans`}
            className="cursor-pointer py-2.5"
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Planos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href={`/org/${orgSlug}/settings/integrations`}
            className="cursor-pointer py-2.5"
            onClick={storeSettingsOrigin}
          >
            <Plug className="mr-2 h-4 w-4" />
            Integrações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem asChild>
          <Link href="/org" className="cursor-pointer py-2.5">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Trocar de conta
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Seção usuário */}
        <DropdownMenuLabel className="px-2 py-3 font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarImage
                src={user.avatarUrl ?? undefined}
                alt={user.fullName ?? user.email}
              />
              <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">
                {userInitials}
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
          <Link
            href={`/org/${orgSlug}/settings/profile`}
            className="cursor-pointer py-2.5"
          >
            <User className="mr-2 h-4 w-4" />
            Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          className="cursor-pointer py-2.5 text-destructive focus:text-destructive"
          onClick={() => executeSignOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
