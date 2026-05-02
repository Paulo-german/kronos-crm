'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useSmartNavigation({ fallbackPath }: { fallbackPath: string }) {
  const router = useRouter()

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(fallbackPath)
  }, [router, fallbackPath])

  return { handleBack }
}
