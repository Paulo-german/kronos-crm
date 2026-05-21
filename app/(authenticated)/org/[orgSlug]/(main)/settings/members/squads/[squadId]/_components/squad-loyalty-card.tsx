'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/_components/ui/card'
import { Switch } from '@/_components/ui/switch'
import { updateSquad } from '@/_actions/squad/update-squad'

interface SquadLoyaltyCardProps {
  squad: { id: string; loyaltyEnabled: boolean }
  canManage: boolean
}

export function SquadLoyaltyCard({ squad, canManage }: SquadLoyaltyCardProps) {
  const { execute, isPending } = useAction(updateSquad, {
    onSuccess: () => toast.success('Configuração de fidelização atualizada!'),
    onError: ({ error }) => toast.error(error.serverError ?? 'Erro ao salvar.'),
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Fidelização de leads</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Quando ativado, leads de contatos que já possuem um responsável neste time são
                sempre direcionados para o mesmo vendedor — independente do modelo de distribuição.
              </p>
            </div>
          </div>
          <Switch
            checked={squad.loyaltyEnabled}
            disabled={!canManage || isPending}
            onCheckedChange={(checked) =>
              execute({ id: squad.id, loyaltyEnabled: checked })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
