import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { ROLE_OPTIONS, TEAM_SIZE_OPTIONS } from '@/_actions/survey/submit-welcome-survey/schema'
import { ROLE_LABELS, TEAM_SIZE_LABELS } from '@/_components/welcome-survey/survey-labels'

interface ProfileStepProps {
  role: string | undefined
  teamSize: string | undefined
  onSelectRole: (value: string) => void
  onSelectTeamSize: (value: string) => void
}

export const ProfileStep = ({
  role,
  teamSize,
  onSelectRole,
  onSelectTeamSize,
}: ProfileStepProps) => {
  return (
    <div className="flex flex-col gap-6 px-1">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Sobre você
        </h2>
        <p className="text-sm text-muted-foreground">
          Isso nos ajuda a personalizar sua experiência
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Qual é o seu cargo?
          </label>
          <Select value={role} onValueChange={onSelectRole}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione seu cargo" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {ROLE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Quantas pessoas tem na equipe comercial?
          </label>
          <Select value={teamSize} onValueChange={onSelectTeamSize}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Selecione o tamanho da equipe" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {TEAM_SIZE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
