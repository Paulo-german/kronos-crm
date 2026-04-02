import { Button } from '@/_components/ui/button'
import { cn } from '@/_lib/utils'
import { CRM_EXPERIENCE_OPTIONS, MAIN_CHALLENGE_OPTIONS } from '@/_actions/survey/submit-welcome-survey/schema'
import { CRM_EXPERIENCE_LABELS, MAIN_CHALLENGE_LABELS } from '@/_components/welcome-survey/survey-labels'

interface OperationStepProps {
  crmExperience: string | undefined
  mainChallenge: string | undefined
  onSelectCrmExperience: (value: string) => void
  onSelectMainChallenge: (value: string) => void
}

export const OperationStep = ({
  crmExperience,
  mainChallenge,
  onSelectCrmExperience,
  onSelectMainChallenge,
}: OperationStepProps) => {
  return (
    <div className="flex flex-col gap-6 px-1">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Sua operação
        </h2>
        <p className="text-sm text-muted-foreground">
          Vamos adaptar o Kronos ao seu perfil
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <label className="text-sm font-medium text-foreground">
            Qual seu nível de experiência com CRM?
          </label>
          <div className="grid grid-cols-1 gap-2">
            {CRM_EXPERIENCE_OPTIONS.map((option) => {
              const isSelected = crmExperience === option
              return (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  onClick={() => onSelectCrmExperience(option)}
                  className={cn(
                    'h-auto justify-start px-4 py-2.5 text-left font-normal transition-colors',
                    isSelected &&
                      'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                  )}
                >
                  {CRM_EXPERIENCE_LABELS[option]}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="text-sm font-medium text-foreground">
            Qual o maior desafio da sua operação?
          </label>
          <div className="grid grid-cols-1 gap-2">
            {MAIN_CHALLENGE_OPTIONS.map((option) => {
              const isSelected = mainChallenge === option
              return (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  onClick={() => onSelectMainChallenge(option)}
                  className={cn(
                    'h-auto justify-start px-4 py-2.5 text-left font-normal transition-colors',
                    isSelected &&
                      'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                  )}
                >
                  {MAIN_CHALLENGE_LABELS[option]}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
