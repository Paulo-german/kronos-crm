'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'

const SIDEBAR_COOKIE_KEY = 'kronos-sidebar-collapsed'
const SIDEBAR_STORAGE_KEY = 'kronos-sidebar-collapsed'
const ANIMATION_MS = 600

interface SidebarContextType {
  isCollapsed: boolean
  isAnimating: boolean
  toggle: () => void
  collapse: () => void
  expand: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

interface SidebarProviderProps {
  children: ReactNode
  defaultCollapsed?: boolean
  persist?: boolean
}

function persistSidebarState(collapsed: boolean) {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  document.cookie = `${SIDEBAR_COOKIE_KEY}=${collapsed}; path=/; max-age=31536000; SameSite=Lax`
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
  persist = true,
}: SidebarProviderProps) {
  // Estado inicial vem do cookie (lido no servidor), eliminando flicker
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isAnimating, setIsAnimating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sincroniza localStorage + cookie ao mudar (skip para instâncias mobile)
  useEffect(() => {
    if (persist) {
      persistSidebarState(isCollapsed)
    }
  }, [isCollapsed, persist])

  // isAnimating=true é setado de forma síncrona nos callbacks abaixo,
  // garantindo que chegue no mesmo render que isCollapsed — sem gap.
  const startAnimation = useCallback(() => {
    setIsAnimating(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIsAnimating(false), ANIMATION_MS)
  }, [])

  const toggle = useCallback(() => {
    startAnimation()
    setIsCollapsed((prev) => !prev)
  }, [startAnimation])

  const collapse = useCallback(() => {
    startAnimation()
    setIsCollapsed(true)
  }, [startAnimation])

  const expand = useCallback(() => {
    startAnimation()
    setIsCollapsed(false)
  }, [startAnimation])

  return (
    <SidebarContext.Provider value={{ isCollapsed, isAnimating, toggle, collapse, expand }}>
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
