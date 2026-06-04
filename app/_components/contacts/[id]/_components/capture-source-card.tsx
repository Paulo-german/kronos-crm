import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Radio } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { CAPTURE_CHANNEL_CONFIG } from '@/_lib/lifecycle/capture-channel-config'
import type { CaptureChannel } from '@prisma/client'

interface CaptureSourceCardProps {
  firstCaptureChannel: CaptureChannel | null
  firstCaptureAt: Date | null
  lastCaptureChannel: CaptureChannel | null
  lastCaptureAt: Date | null
}

interface CaptureRowProps {
  label: string
  channel: CaptureChannel | null
  date: Date | null
}

function CaptureRow({ label, channel, date }: CaptureRowProps) {
  const config = channel ? CAPTURE_CHANNEL_CONFIG[channel] : null
  const Icon = config?.icon

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {config ? (
          <>
            {config.label}
            {date && (
              <span className="font-normal text-muted-foreground">
                · {format(date, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
          </>
        ) : (
          <span className="font-normal text-muted-foreground">Não registrado</span>
        )}
      </span>
    </div>
  )
}

export function CaptureSourceCard({
  firstCaptureChannel,
  firstCaptureAt,
  lastCaptureChannel,
  lastCaptureAt,
}: CaptureSourceCardProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Radio className="h-4 w-4" />
          Origem & Captura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CaptureRow
          label="Primeira captura"
          channel={firstCaptureChannel}
          date={firstCaptureAt}
        />
        <CaptureRow
          label="Última captura"
          channel={lastCaptureChannel}
          date={lastCaptureAt}
        />
      </CardContent>
    </Card>
  )
}
