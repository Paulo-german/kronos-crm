'use client'

import { createContext, useContext } from 'react'
import type { ContactCapabilities } from '@/_lib/contact/contact-capabilities'

/**
 * Contexto de renderização do contato, resolvido na borda (page):
 * - capabilities: o que mostrar conforme os módulos da org
 * - basePath: o produto atual ('crm' | 'prospection' | 'inbox' | 'agents'),
 *   usado para montar links internos de contato relativos ao produto.
 */
interface ContactUIContextValue {
  capabilities: ContactCapabilities
  basePath: string
}

const ContactUIContext = createContext<ContactUIContextValue | null>(null)

interface ContactCapabilitiesProviderProps {
  capabilities: ContactCapabilities
  basePath: string
  children: React.ReactNode
}

export function ContactCapabilitiesProvider({
  capabilities,
  basePath,
  children,
}: ContactCapabilitiesProviderProps) {
  return (
    <ContactUIContext.Provider value={{ capabilities, basePath }}>
      {children}
    </ContactUIContext.Provider>
  )
}

function useContactUI(): ContactUIContextValue {
  const context = useContext(ContactUIContext)
  if (!context) {
    throw new Error(
      'useContactCapabilities/useContactBasePath devem ser usados dentro de ContactCapabilitiesProvider',
    )
  }
  return context
}

/**
 * Flags de features do contato (deals/customFields/inbox). Componentes folha
 * leem daqui em vez de conhecer "módulos" — a tradução mora na borda (page).
 */
export function useContactCapabilities(): ContactCapabilities {
  return useContactUI().capabilities
}

/**
 * Slug do produto atual, para montar links internos de contato relativos
 * (ex: `/org/${orgSlug}/${basePath}/contacts/${id}`).
 */
export function useContactBasePath(): string {
  return useContactUI().basePath
}
