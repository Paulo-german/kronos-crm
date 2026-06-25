'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { WEBHOOK_EVENT_CATALOG } from '../_lib/webhook-events'
import {
  PLATFORM_LABELS,
  type WebhookPlatform,
} from '../_lib/platform-templates'

// Valor sentinela para "sem filtro" — o Radix Select não aceita value="" e
// precisamos distinguir "qualquer evento" (null) de um id de evento real.
const ANY_EVENT_VALUE = '__any__'

interface ProviderEventSelectProps {
  platform: WebhookPlatform
  value: string | null
  onChange: (value: string | null) => void
}

// Dropdown do gatilho (qual evento do provedor dispara este webhook). Só aparece
// para provedores com catálogo curado; GENERIC/OTHER não têm catálogo e ficam
// fora — nesses casos o componente não renderiza nada (qualquer evento é aceito).
export function ProviderEventSelect({
  platform,
  value,
  onChange,
}: ProviderEventSelectProps) {
  const catalog = WEBHOOK_EVENT_CATALOG[platform]
  if (!catalog) return null

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Gatilho (quando disparar)</label>
      <Select
        value={value ?? ANY_EVENT_VALUE}
        onValueChange={(selected) =>
          onChange(selected === ANY_EVENT_VALUE ? null : selected)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o evento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY_EVENT_VALUE}>
            <span className="flex flex-col items-start">
              <span>Qualquer evento</span>
              <span className="text-xs text-muted-foreground">
                Processa todos os envios deste provedor.
              </span>
            </span>
          </SelectItem>
          {catalog.events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              <span className="flex flex-col items-start">
                <span>{event.label}</span>
                <span className="text-xs text-muted-foreground">
                  {event.description}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Filtra quais envios da {PLATFORM_LABELS[platform]} viram ação no CRM. Se
        o evento recebido não puder ser identificado, o envio é processado mesmo
        assim (nunca bloqueamos um lead por causa do filtro).
      </p>
    </div>
  )
}
