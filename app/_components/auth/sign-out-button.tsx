'use client'

import { useAction } from 'next-safe-action/hooks'
import { signOut } from '@/_actions/auth/sign-out'
import { Button } from '@/_components/ui/button'
import { LogOut } from 'lucide-react'

export const SignOutButton = () => {
  const { execute, status } = useAction(signOut)

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      onClick={() => execute()}
      disabled={status === 'executing'}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {status === 'executing' ? 'Saindo...' : 'Sair'}
    </Button>
  )
}
