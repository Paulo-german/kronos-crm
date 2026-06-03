'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface BackButtonProps {
  orgSlug?: string
  href?: string
}

export const BackButton = ({ orgSlug, href }: BackButtonProps) => {
  const router = useRouter()

  const handleBack = () => {
    if (href) {
      const origin = sessionStorage.getItem('settings-origin')
      sessionStorage.removeItem('settings-origin')
      router.push(origin ?? href)
      return
    }

    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(orgSlug ? `/org/${orgSlug}/crm/home` : '/org')
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleBack}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  )
}
