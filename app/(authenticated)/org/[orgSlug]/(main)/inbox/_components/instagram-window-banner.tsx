'use client'

import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/_components/ui/alert'
import { Checkbox } from '@/_components/ui/checkbox'
import { Label } from '@/_components/ui/label'

interface InstagramWindowBannerProps {
  /** Se a janela padrão de 24h está aberta */
  isWithin24h: boolean
  /** Se ainda está dentro da janela de 7 dias do human_agent tag */
  isWithin7d: boolean
  /** Controlado pelo componente pai — indica se o envio usará a tag human_agent */
  useHumanAgentTag: boolean
  onHumanAgentTagChange: (checked: boolean) => void
}

/**
 * Banner contextual para conversas Instagram Direct quando a janela de 24h expira.
 *
 * Estados:
 * - Dentro de 24h → nada renderizado (janela normal)
 * - Entre 24h e 7d → aviso amber + checkbox "Enviar como resposta humana"
 * - Acima de 7d   → aviso destrutivo (composer será desabilitado pelo ChatView)
 *
 * O checkbox fica marcado por padrão quando a janela de 24h expirou mas ainda
 * está dentro de 7 dias — o usuário pode desmarcar, mas a mensagem só vai se
 * a tag estiver ativa (a action bloqueia o envio sem ela nesse estado).
 */
export function InstagramWindowBanner({
  isWithin24h,
  isWithin7d,
  useHumanAgentTag,
  onHumanAgentTagChange,
}: InstagramWindowBannerProps) {
  // Janela normal: sem banner
  if (isWithin24h) return null

  // Janela > 7 dias: somente aviso de bloqueio (sem checkbox — nada pode ser enviado)
  if (!isWithin7d) {
    return (
      <div className="mx-4 mt-3">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Não é possível responder. O cliente precisa enviar uma nova mensagem
            para reabrir a conversa.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Entre 24h e 7d: aviso + opção de resposta humana
  return (
    <div className="mx-4 mt-3 space-y-2">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Janela de 24h expirada. Você pode enviar uma resposta humana por até 7
          dias após a última mensagem do cliente.
        </AlertDescription>
      </Alert>
      <div className="flex items-center gap-2 px-1">
        <Checkbox
          id="use-human-agent-tag"
          checked={useHumanAgentTag}
          onCheckedChange={(checked) => onHumanAgentTagChange(checked === true)}
        />
        <Label
          htmlFor="use-human-agent-tag"
          className="cursor-pointer text-sm font-normal text-muted-foreground"
        >
          Enviar como resposta humana
        </Label>
      </div>
    </div>
  )
}
