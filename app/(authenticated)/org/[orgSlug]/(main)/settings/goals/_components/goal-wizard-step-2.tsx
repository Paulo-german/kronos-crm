'use client'

import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { GoalSuggestionHint } from './goal-suggestion-hint'
import type { CreateGoalFormValues } from './goal-form-types'

export function GoalWizardStep2() {
  const form = useFormContext<CreateGoalFormValues>()

  const watchedType = form.watch('type')
  const watchedScope = form.watch('scope')
  const watchedUserId = form.watch('targetUserId')
  const watchedPipelineId = form.watch('targetPipelineId')

  const isRevenue = watchedType === 'REVENUE'

  const placeholder = isRevenue ? 'Ex: 50000' : 'Ex: 30'
  const label = isRevenue ? 'Valor alvo (R$)' : 'Quantidade alvo'

  const handleUseSuggestion = (value: number) => {
    form.setValue('targetValue', value, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="targetValue"
        render={({ field }) => {
          const numericValue = Number(field.value)
          return (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={placeholder}
                  min={0}
                  step={isRevenue ? 100 : 1}
                  value={isNaN(numericValue) ? '' : numericValue}
                  onChange={(event) =>
                    field.onChange(event.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      {watchedType && watchedScope && (
        <GoalSuggestionHint
          type={watchedType}
          scope={watchedScope}
          targetUserId={watchedUserId ?? null}
          targetPipelineId={watchedPipelineId ?? null}
          onUseSuggestion={handleUseSuggestion}
        />
      )}
    </div>
  )
}
