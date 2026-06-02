'use client'

import Link from 'next/link'
import { ChevronDown, Building2, CreditCard, LayoutGrid, Plug, User, LogOut, ArrowLeftRight, Copy, Check } from 'lucide-react'
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
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/20 text-[9px] font-bold text-primary ring-1 ring-primary/20">
            {orgInitials}
          </div>
          <span className="hidden max-w-[120px] truncate md:block">{organization.name}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* Seção Org */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/20 text-xs font-bold text-primary ring-1 ring-primary/20">
              {orgInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{organization.name}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <p className="truncate text-xs text-muted-foreground">{organization.slug}</p>
                <span className="text-muted-foreground/40">·</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
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

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={`/org/${orgSlug}/settings/organization`} className="flex items-center gap-2 cursor-pointer">
            <Building2 className="h-4 w-4" />
            Conta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/org/${orgSlug}/settings/billing`} className="flex items-center gap-2 cursor-pointer">
            <CreditCard className="h-4 w-4" />
            Painel financeiro
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/org/${orgSlug}/plans`} className="flex items-center gap-2 cursor-pointer">
            <LayoutGrid className="h-4 w-4" />
            Planos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/org/${orgSlug}/settings/integrations`} className="flex items-center gap-2 cursor-pointer">
            <Plug className="h-4 w-4" />
            Integrações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/org" className="flex items-center gap-2 cursor-pointer">
            <ArrowLeftRight className="h-4 w-4" />
            Trocar de conta
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Seção usuário */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? user.email} />
              <AvatarFallback className="text-xs font-medium">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{user.fullName ?? 'Usuário'}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={`/org/${orgSlug}/settings/profile`} className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Perfil
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => executeSignOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
