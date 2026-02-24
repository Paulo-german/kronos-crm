'use client'

import { forwardRef, useState } from 'react'
import { EyeIcon, EyeClosedIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'

const InputPassword = forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>((props, ref) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        placeholder="Digite sua senha"
        {...props}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-0 top-1/2 -translate-y-1/2"
      >
        {showPassword ? <EyeIcon /> : <EyeClosedIcon />}
      </Button>
    </div>
  )
})

InputPassword.displayName = 'InputPassword'

export default InputPassword
