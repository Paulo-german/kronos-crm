import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { useState } from 'react'

import { EyeIcon, EyeClosedIcon } from 'lucide-react'

const InputPassword = ({ ...rest }) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        placeholder="Digite sua senha"
        {...rest}
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
}

export default InputPassword
