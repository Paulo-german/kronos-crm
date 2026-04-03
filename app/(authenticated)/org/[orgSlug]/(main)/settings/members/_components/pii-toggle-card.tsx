'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { ShieldAlert } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Switch } from '@/_components/ui/switch'
import { Label } from '@/_components/ui/label'
import { togglePiiMasking } from '@/_actions/organization/toggle-pii-masking'

interface PiiToggleCardProps {
  defaultValue: boolean
}

export function PiiToggleCard({ defaultValue }: PiiToggleCardProps) {
  const [isEnabled, setIsEnabled] = useState(defaultValue)

  const { execute, isPending } = useAction(togglePiiMasking, {
    onSuccess: () => {
      toast.success('Configuração de privacidade atualizada.')
    },
    onError: ({ error }) => {
      // Reverter o estado otimista em caso de erro
      setIsEnabled((previous) => !previous)
      toast.error(error.serverError || 'Erro ao atualizar configuração.')
    },
  })

  const handleCheckedChange = (checked: boolean) => {
    setIsEnabled(checked)
    execute({ hidePiiFromMembers: checked })
  }

  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          Proteção de Dados de Contato
        </CardTitle>
        <CardDescription>
          Configure a visibilidade de informações sensíveis dos contatos para membros da equipe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="hide-pii" className="cursor-pointer text-sm font-medium">
              Ocultar dados de contato dos membros
            </Label>
            <p className="text-xs text-muted-foreground">
              Quando ativado, membros não verão email, telefone e CPF dos contatos.
              Apenas administradores e proprietários terão acesso completo.
            </p>
          </div>
          <Switch
            id="hide-pii"
            checked={isEnabled}
            disabled={isPending}
            onCheckedChange={handleCheckedChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
