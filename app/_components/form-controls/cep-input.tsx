'use client'

import { forwardRef } from 'react'
import {
  NumberFormatBase,
  type NumberFormatBaseProps,
} from 'react-number-format'
import { Input } from '@/_components/ui/input'
import { cn } from '@/_lib/utils'

export interface CepInputProps extends Omit<NumberFormatBaseProps, 'format'> {
  className?: string
}

const CepInput = forwardRef<HTMLInputElement, CepInputProps>(
  ({ className, ...props }, ref) => {
    // Formatação: XXXXX-XXX
    const format = (value: string) => {
      const numbers = value.replace(/\D/g, '')
      const limited = numbers.substring(0, 8)

      if (limited.length === 0) return ''
      if (limited.length <= 5) return limited
      return `${limited.substring(0, 5)}-${limited.substring(5)}`
    }

    return (
      <NumberFormatBase
        getInputRef={ref}
        format={format}
        customInput={Input}
        className={cn(className)}
        placeholder="00000-000"
        {...props}
      />
    )
  },
)

CepInput.displayName = 'CepInput'

export { CepInput }
