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
    <div
      onClick={() => execute()}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex cursor-pointer items-center rounded-md py-2 text-sm font-medium text-muted-foreground transition-all duration-500 hover:bg-destructive/10 hover:text-destructive',
        isCollapsed ? 'pl-[1.125rem] pr-0' : 'w-full justify-start px-3',
        status === 'executing' && 'pointer-events-none opacity-50',
      )}
    >
      <div className="flex items-center">
        <LogOut className="h-4 w-4" />
      </div>
      <span
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] overflow-hidden whitespace-nowrap transition-all duration-500',
          isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-auto opacity-100 delay-100',
        )}
      >
        Sair
      </span>
    </div>
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
