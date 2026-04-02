import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { REFERRAL_SOURCE_OPTIONS } from '@/_actions/survey/submit-welcome-survey/schema'
import { REFERRAL_SOURCE_LABELS } from '@/_components/welcome-survey/survey-labels'

interface SurveyStepProps {
  value: string | undefined
  onSelect: (value: string) => void
}

export const ReferralStep = ({ value, onSelect }: SurveyStepProps) => {
  return (
    <div className="flex flex-col gap-6 px-1">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Como conheceu o Kronos?
        </h2>
        <p className="text-sm text-muted-foreground">
          Queremos saber como você chegou até aqui
        </p>
      </div>

      <Select value={value} onValueChange={onSelect}>
        <SelectTrigger className="h-11">
          <SelectValue placeholder="Selecione uma opção" />
        </SelectTrigger>
        <SelectContent>
          {REFERRAL_SOURCE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {REFERRAL_SOURCE_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
