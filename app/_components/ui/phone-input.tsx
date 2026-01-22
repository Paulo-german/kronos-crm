'use client'

import { forwardRef } from 'react'
import {
  NumberFormatBase,
  type NumberFormatBaseProps,
} from 'react-number-format'
import { Input } from '@/_components/ui/input'
import { cn } from '@/_lib/utils'

export interface PhoneInputProps extends Omit<NumberFormatBaseProps, 'format'> {
  className?: string
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, ...props }, ref) => {
    // Formatação manual robusta que não bloqueia o 11º dígito
    const format = (value: string) => {
      // 1. Remove qualquer caractere que não seja número
      const numbers = value.replace(/\D/g, '')

      // 2. Limita a 11 dígitos para evitar números infinitos
      const limited = numbers.substring(0, 11)

      // 3. Aplica a formatação baseada no tamanho
      if (limited.length === 0) return ''

      // (XX
      if (limited.length <= 2) {
        return `(${limited}`
      }

      // (XX) ZZZZ
      if (limited.length <= 6) {
        return `(${limited.substring(0, 2)}) ${limited.substring(2)}`
      }

      // (XX) ZZZZ-ZZZZ (Fixo - até 10 dígitos)
      if (limited.length <= 10) {
        return `(${limited.substring(0, 2)}) ${limited.substring(
          2,
          6,
        )}-${limited.substring(6)}`
      }

      // (XX) 9ZZZZ-ZZZZ (Celular - 11 dígitos)
      return `(${limited.substring(0, 2)}) ${limited.substring(
        2,
        7,
      )}-${limited.substring(7)}`
    }

    return (
      <NumberFormatBase
        getInputRef={ref}
        format={format}
        customInput={Input}
        className={cn(className)}
        {...props}
      />
    )
  },
)

PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
