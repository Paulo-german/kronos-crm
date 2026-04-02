import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface SlideNavigationProps {
  onBack: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
  canAdvance?: boolean
  isSubmitting?: boolean
  nextLabel?: string
  completeLabel?: string
}

export const SlideNavigation = ({
  onBack,
  onNext,
  isFirst,
  isLast,
  canAdvance = true,
  isSubmitting = false,
  nextLabel = 'Avançar',
  completeLabel = 'Concluir',
}: SlideNavigationProps) => {
  return (
    <div className="flex items-center gap-2">
      {!isFirst && (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Voltar
        </Button>
      )}

      <Button
        type="button"
        variant="default"
        onClick={onNext}
        disabled={!canAdvance || isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLast ? completeLabel : nextLabel}
      </Button>
    </div>
  )
}
