'use client'

import { forwardRef } from 'react'
import { NumericFormat, NumericFormatProps } from 'react-number-format'
import { Input } from '@/_components/ui/input'
import { cn } from '@/_lib/utils'

export interface CurrencyInputProps extends Omit<
  NumericFormatProps,
  'thousandSeparator' | 'decimalSeparator'
> {
  className?: string
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <NumericFormat
        getInputRef={ref}
        thousandSeparator="."
        decimalSeparator=","
        prefix="R$ "
        decimalScale={2}
        fixedDecimalScale
        allowNegative={false}
        customInput={Input}
        className={cn(className)}
        {...props}
      />
    )
  },
)

CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
