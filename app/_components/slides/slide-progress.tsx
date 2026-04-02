import { cn } from '@/_lib/utils'

interface SlideProgressProps {
  currentStep: number
  totalSteps: number
}

export const SlideProgress = ({ currentStep, totalSteps }: SlideProgressProps) => {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={cn(
            'h-0.5 w-5 rounded-full transition-all duration-300',
            index === currentStep
              ? 'bg-primary'
              : index < currentStep
                ? 'bg-primary/50'
                : 'bg-muted',
          )}
        />
      ))}
    </div>
  )
}
