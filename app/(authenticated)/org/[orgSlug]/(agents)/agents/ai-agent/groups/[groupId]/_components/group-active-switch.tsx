'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { CircleIcon } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import { updateAgentGroup } from '@/_actions/agent-group/update-agent-group'

interface GroupActiveSwitchProps {
  groupId: string
  defaultActive: boolean
}

export function GroupActiveSwitch({ groupId, defaultActive }: GroupActiveSwitchProps) {
  const [isActive, setIsActive] = useState(defaultActive)

  const { execute, isPending } = useAction(updateAgentGroup, {
    onSuccess: () => {
      toast.success(isActive ? 'Equipe ativada' : 'Equipe desativada')
    },
    onError: () => {
      setIsActive((prev) => !prev)
      toast.error('Erro ao alterar status da equipe')
    },
  })

  const handleToggle = (checked: boolean) => {
    setIsActive(checked)
    execute({ groupId, isActive: checked })
  }

  return (
    <>
      {isActive ? (
        <Badge
          variant="outline"
          className="h-6 gap-1.5 border-kronos-green/20 bg-kronos-green/10 px-2 text-xs font-semibold text-kronos-green hover:bg-kronos-green/20"
        >
          <CircleIcon className="h-1.5 w-1.5 fill-current" />
          Ativa
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="h-6 gap-1.5 px-2 text-xs font-semibold"
        >
          <CircleIcon className="h-1.5 w-1.5 fill-current" />
          Inativa
        </Badge>
      )}
      <Switch
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
    </>
  )
}
