'use client'

import { useEffect } from 'react'

interface ProductThemeProps {
  product: 'crm' | 'inbox' | 'agents' | 'prospection'
}

export function ProductTheme({ product }: ProductThemeProps) {
  useEffect(() => {
    document.documentElement.dataset.product = product
    return () => {
      delete document.documentElement.dataset.product
    }
  }, [product])

  return null
}
