'use client'

import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Textarea } from '@/_components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'

const NOTIFY_TARGET_OPTIONS = [
  { value: 'none', label: 'Sem notificação' },
  { value: 'specific_number', label: 'Número específico' },
  { value: 'deal_assignee', label: 'Responsável pelo negócio' },
] as const

interface HandOffConfigProps {
  notifyTarget: 'none' | 'specific_number' | 'deal_assignee'
  specificPhone?: string
  notificationMessage?: string
  onNotifyTargetChange: (value: string) => void
  onSpecificPhoneChange: (value: string | undefined) => void
  onNotificationMessageChange: (value: string | undefined) => void
}

const HandOffConfig = ({
  notifyTarget,
  specificPhone,
  notificationMessage,
  onNotifyTargetChange,
  onSpecificPhoneChange,
  onNotificationMessageChange,
}: HandOffConfigProps) => {
  return (
    <div className="space-y-3 border-t pt-3">
      <Label className="text-xs">Notificação ao atendente</Label>
      <p className="text-xs text-muted-foreground mt-1">
        O agente decide em tempo real se deve transferir (pausar a IA) ou apenas notificar (IA continua). A configuração abaixo define como o responsável será notificado em ambos os casos.
      </p>

      <div className="space-y-1.5">
        <Select
          value={notifyTarget}
          onValueChange={(val) =>
            onNotifyTargetChange(val)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de notificação" />
          </SelectTrigger>
          <SelectContent>
            {NOTIFY_TARGET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {notifyTarget === 'specific_number' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Número de WhatsApp *</Label>
          <Input
            placeholder="5511999999999"
            value={specificPhone ?? ''}
            onChange={(event) =>
              onSpecificPhoneChange(event.target.value || undefined)
            }
          />
          <p className="text-[11px] text-muted-foreground">
            Informe o número com DDD e código do país
          </p>
        </div>
      )}

      {notifyTarget === 'deal_assignee' && (
        <p className="text-[11px] text-muted-foreground">
          O responsável pelo negócio será notificado no WhatsApp cadastrado no
          perfil dele. Se não houver telefone, a notificação será ignorada
          silenciosamente.
        </p>
      )}

      {(notifyTarget === 'specific_number' || notifyTarget === 'deal_assignee') && (
        <div className="space-y-1.5">
          <Label className="text-xs">Mensagem personalizada (opcional)</Label>
          <Textarea
            placeholder="Ex: Conversa transferida. Por favor, assuma o atendimento."
            value={notificationMessage ?? ''}
            onChange={(event) =>
              onNotificationMessageChange(event.target.value || undefined)
            }
            rows={2}
          />
          <p className="text-[11px] text-muted-foreground">
            Se vazio, será enviada uma mensagem padrão com o nome do contato e motivo
          </p>
        </div>
      )}
    </div>
  )
}

export default HandOffConfig
