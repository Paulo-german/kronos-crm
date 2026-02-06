'use client'

import { forwardRef } from 'react'
import {
  NumberFormatBase,
  type NumberFormatBaseProps,
} from 'react-number-format'
import { Input } from '@/_components/ui/input'
import { cn } from '@/_lib/utils'

export interface CnpjInputProps extends Omit<NumberFormatBaseProps, 'format'> {
  className?: string
}

const CnpjInput = forwardRef<HTMLInputElement, CnpjInputProps>(
  ({ className, ...props }, ref) => {
    // Formatação: XX.XXX.XXX/XXXX-XX
    const format = (value: string) => {
      const numbers = value.replace(/\D/g, '')
      const limited = numbers.substring(0, 14)

      if (limited.length === 0) return ''
      if (limited.length <= 2) return limited
      if (limited.length <= 5) return `${limited.substring(0, 2)}.${limited.substring(2)}`
      if (limited.length <= 8) return `${limited.substring(0, 2)}.${limited.substring(2, 5)}.${limited.substring(5)}`
      if (limited.length <= 12) return `${limited.substring(0, 2)}.${limited.substring(2, 5)}.${limited.substring(5, 8)}/${limited.substring(8)}`
      return `${limited.substring(0, 2)}.${limited.substring(2, 5)}.${limited.substring(5, 8)}/${limited.substring(8, 12)}-${limited.substring(12)}`
    }

    return (
      <NumberFormatBase
        getInputRef={ref}
        format={format}
        customInput={Input}
        className={cn(className)}
        placeholder="00.000.000/0000-00"
        {...props}
      />
    )
  },
)

CnpjInput.displayName = 'CnpjInput'

export { CnpjInput }
