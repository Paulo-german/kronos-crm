'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'

export function BackButton() {
  const router = useRouter()

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/org')
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleBack}>
      <ChevronLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  )
}
