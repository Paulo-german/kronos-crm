'use client'

import { useAction } from 'next-safe-action/hooks'
import { signOut } from '@/_actions/auth/sign-out'
import { Button } from '@/_components/ui/button'
import { LogOut } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'

interface SignOutButtonProps {
  isCollapsed?: boolean
}

export const SignOutButton = ({ isCollapsed = false }: SignOutButtonProps) => {
  const { execute, status } = useAction(signOut)

  const buttonContent = (
    <Button
      variant="ghost"
      size={isCollapsed ? 'icon' : 'sm'}
      className={cn(
        'text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
        isCollapsed ? 'h-9 w-9' : 'w-full justify-start',
      )}
      onClick={() => execute()}
      disabled={status === 'executing'}
    >
      <LogOut className={cn('h-4 w-4', !isCollapsed && 'mr-2')} />
      {!isCollapsed && (status === 'executing' ? 'Saindo...' : 'Sair')}
    </Button>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {status === 'executing' ? 'Saindo...' : 'Sair'}
        </TooltipContent>
      </Tooltip>
    )
  }

  return buttonContent
}
