'use client'

import { forwardRef } from 'react'
import {
  NumberFormatBase,
  type NumberFormatBaseProps,
} from 'react-number-format'
import { Input } from '@/_components/ui/input'
import { cn } from '@/_lib/utils'

export interface CpfInputProps extends Omit<NumberFormatBaseProps, 'format'> {
  className?: string
}

const CpfInput = forwardRef<HTMLInputElement, CpfInputProps>(
  ({ className, ...props }, ref) => {
    // Formatação: XXX.XXX.XXX-XX
    const format = (value: string) => {
      const numbers = value.replace(/\D/g, '')
      const limited = numbers.substring(0, 11)

      if (limited.length === 0) return ''
      if (limited.length <= 3) return limited
      if (limited.length <= 6) return `${limited.substring(0, 3)}.${limited.substring(3)}`
      if (limited.length <= 9) return `${limited.substring(0, 3)}.${limited.substring(3, 6)}.${limited.substring(6)}`
      return `${limited.substring(0, 3)}.${limited.substring(3, 6)}.${limited.substring(6, 9)}-${limited.substring(9)}`
    }

    return (
      <NumberFormatBase
        getInputRef={ref}
        format={format}
        customInput={Input}
        className={cn(className)}
        placeholder="000.000.000-00"
        {...props}
      />
    )
  },
)

CpfInput.displayName = 'CpfInput'

export { CpfInput }
