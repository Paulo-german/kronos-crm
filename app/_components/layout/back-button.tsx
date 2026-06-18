'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface BackButtonProps {
  orgSlug?: string
  href?: string
  /**
   * Destino quando não há histórico para voltar (router.back()).
   * Usado pelas telas de detalhe (deal/contato) para cair na sua lista.
   * Ignorado quando `href` é informado.
   */
  fallbackPath?: string
}

export const BackButton = ({
  orgSlug,
  href,
  fallbackPath,
}: BackButtonProps) => {
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
      return
    }

    router.push(fallbackPath ?? (orgSlug ? `/org/${orgSlug}/crm/home` : '/org'))
  }

  return (
    <Button variant="outline" size="sm" onClick={handleBack}>
      <ChevronLeft className="mr-2 h-4 w-4" />
      Voltar
    </Button>
  )
}
