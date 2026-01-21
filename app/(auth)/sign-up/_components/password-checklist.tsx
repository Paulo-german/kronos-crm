import { Check, X } from 'lucide-react'
import { passwordRules } from '@/_actions/auth/sign-up/schema'
import { Progress } from '@/_components/ui/progress'

interface Props {
  value: string
}

export function PasswordChecklist({ value = '' }: Props) {
  if (!value) return null

  const validCount = passwordRules.filter((rule) =>
    rule.regex.test(value),
  ).length
  const totalCount = passwordRules.length
  const progress = (validCount / totalCount) * 100

  let progressColor = '!bg-red-500' // Default / Weak
  if (progress === 100) {
    progressColor = '!bg-green-500'
  } else if (progress >= 50) {
    progressColor = '!bg-yellow-500'
  }

  return (
    <div className="mt-3 space-y-3 rounded-md p-3 text-xs">
      <Progress
        value={progress}
        className={`h-2 [&>*]:${progressColor} transition-all`}
      />

      <div className="space-y-2 pt-1">
        {passwordRules.map((rule) => {
          const isValid = rule.regex.test(value)
          return (
            <div
              key={rule.label}
              className={`flex items-center gap-2 ${
                isValid ? 'text-green-600' : 'text-muted-foreground'
              }`}
            >
              {isValid ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5 opacity-50" />
              )}
              <span className={isValid ? 'line-through opacity-70' : ''}>
                {rule.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
