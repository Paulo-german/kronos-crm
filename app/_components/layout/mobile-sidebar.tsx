'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/_components/ui/sheet'
import { SidebarProvider } from '@/_providers/sidebar-provider'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { SidebarContent } from '@/_components/layout/sidebar-content'
import type { ModuleSlug } from '@/_data-access/module/types'
import type { MemberRole } from '@prisma/client'

interface MobileSidebarProps {
  activeModules?: ModuleSlug[]
  organizations?: { id: string; name: string; slug: string; role: MemberRole }[]
  isSuperAdmin?: boolean
  credits?: { available: number; monthlyLimit: number; orgSlug: string }
}

export const MobileSidebar = ({
  activeModules,
  organizations,
  isSuperAdmin,
  credits,
}: MobileSidebarProps) => {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close ao navegar
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu de navegação"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 [&>button:first-child]:hidden"
        >
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <SidebarProvider defaultCollapsed={false} persist={false}>
            <TooltipProvider>
              <SidebarContent
                activeModules={activeModules}
                organizations={organizations}
                isSuperAdmin={isSuperAdmin}
                credits={credits}
                onNavigate={() => setOpen(false)}
              />
            </TooltipProvider>
          </SidebarProvider>
        </SheetContent>
      </Sheet>
    </>
  )
}
