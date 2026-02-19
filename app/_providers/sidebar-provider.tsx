'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

const SIDEBAR_COOKIE_KEY = 'kronos-sidebar-collapsed'
const SIDEBAR_STORAGE_KEY = 'kronos-sidebar-collapsed'

interface SidebarContextType {
  isCollapsed: boolean
  toggle: () => void
  collapse: () => void
  expand: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

interface SidebarProviderProps {
  children: ReactNode
  defaultCollapsed?: boolean
}

function persistSidebarState(collapsed: boolean) {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  document.cookie = `${SIDEBAR_COOKIE_KEY}=${collapsed}; path=/; max-age=31536000; SameSite=Lax`
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  // Estado inicial vem do cookie (lido no servidor), eliminando flicker
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  // Sincroniza localStorage + cookie ao mudar
  useEffect(() => {
    persistSidebarState(isCollapsed)
  }, [isCollapsed])

  const toggle = useCallback(() => setIsCollapsed((prev) => !prev), [])
  const collapse = useCallback(() => setIsCollapsed(true), [])
  const expand = useCallback(() => setIsCollapsed(false), [])

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle, collapse, expand }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
