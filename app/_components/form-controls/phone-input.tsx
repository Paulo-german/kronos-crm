'use client'

import { forwardRef } from 'react'
import ReactPhoneInput, {
  type Value,
  type Country,
  getCountryCallingCode,
} from 'react-phone-number-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { cn } from '@/_lib/utils'

export interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const getFlagEmoji = (countryCode: string) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))

interface CountrySelectorProps {
  value?: Country
  onChange: (country?: Country) => void
  options: readonly { value?: Country; label: string; divider?: boolean }[]
  iconComponent: React.ComponentType<unknown>
  disabled?: boolean
}

const CountrySelector = ({ value, onChange, options, disabled }: CountrySelectorProps) => {
  const callingCode = value ? getCountryCallingCode(value) : null

  return (
    <Select
      value={value ?? ''}
      onValueChange={(val) => onChange(val ? (val as Country) : undefined)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[88px] shrink-0 rounded-r-none border-r-0 px-2 focus:ring-0 focus:ring-offset-0">
        <SelectValue>
          {value ? (
            <span className="flex items-center gap-1 text-sm">
              <span>{getFlagEmoji(value)}</span>
              <span className="text-muted-foreground">+{callingCode}</span>
            </span>
          ) : (
            <span className="text-muted-foreground text-base">🌐</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72 w-64">
        {options
          .filter((option) => !option.divider && option.value)
          .map((option) => (
            <SelectItem key={option.value} value={option.value!}>
              <span className="flex items-center gap-2">
                <span>{getFlagEmoji(option.value!)}</span>
                <span>{option.label}</span>
                <span className="ml-auto text-muted-foreground">
                  +{getCountryCallingCode(option.value!)}
                </span>
              </span>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}

const InputField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <Input
      {...props}
      ref={ref}
      className={cn(
        'rounded-l-none border-l-0 focus-visible:ring-0 focus-visible:ring-offset-0',
        className,
      )}
    />
  ),
)
InputField.displayName = 'PhoneInputField'

export function PhoneInput({ value, onChange, placeholder, disabled, className }: PhoneInputProps) {
  return (
    <div
      className={cn(
        'flex rounded-md ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <ReactPhoneInput
        defaultCountry="BR"
        value={(value || '') as Value}
        onChange={(val) => onChange(val ?? '')}
        inputComponent={InputField}
        countrySelectComponent={CountrySelector}
        disabled={disabled}
        placeholder={placeholder}
        className="flex w-full"
      />
    </div>
  )
}
