'use client'

import { useAction } from 'next-safe-action/hooks'
import { signOut } from '@/_actions/auth/sign-out'
import { LogOut } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'
import { useSidebar } from '@/_providers/sidebar-provider'

interface SignOutButtonProps {
  isCollapsed?: boolean
}

export const SignOutButton = ({ isCollapsed = false }: SignOutButtonProps) => {
  const { execute, status } = useAction(signOut)
  const { isAnimating } = useSidebar()

  const buttonContent = (
    <div
      onClick={() => execute()}
      className={cn(
        'ease-[cubic-bezier(0.25,0.76,0.35,1)] group flex cursor-pointer items-center rounded-md py-2 text-sm font-medium text-muted-foreground transition-all duration-500 hover:bg-destructive/10 hover:text-destructive',
        isCollapsed ? 'mx-2 px-3' : 'w-full px-3',
        status === 'executing' && 'pointer-events-none opacity-50',
        isAnimating && 'pointer-events-none',
      )}
    >
      <div className="flex items-center">
        <LogOut className="h-4 w-4" />
      </div>
      <span
        className={cn(
          'ease-[cubic-bezier(0.25,0.76,0.35,1)] min-w-0 overflow-hidden whitespace-nowrap transition-all duration-500',
          isCollapsed ? 'w-0 opacity-0' : 'ml-3 w-auto opacity-100 delay-100',
        )}
      >
        Sair
      </span>
    </div>
  )

  return (
    <Tooltip delayDuration={300} open={!isCollapsed || isAnimating ? false : undefined}>
      <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right" sideOffset={10} className="flex items-center gap-2 bg-destructive px-3 py-2 shadow-none">
          <LogOut className="h-3.5 w-3.5 text-white/70" />
          <span>{status === 'executing' ? 'Saindo...' : 'Encerrar sessão'}</span>
        </TooltipContent>
      )}
    </Tooltip>
  )
}
