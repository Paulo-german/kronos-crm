'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { HelpCircle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
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
  tooltip: string
  channel: CaptureChannel | null
  date: Date | null
}

function CaptureRow({ label, tooltip, channel, date }: CaptureRowProps) {
  const config = channel ? CAPTURE_CHANNEL_CONFIG[channel] : null
  const Icon = config?.icon

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1 text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 cursor-help text-muted-foreground/50" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px] text-center">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </span>
      <span className="flex items-center gap-1.5 font-medium">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {config ? (
          <>
            {config.label}
            {date && (
              <span className="font-normal text-muted-foreground">
                · {format(date, 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            )}
          </>
        ) : (
          <span className="font-normal text-muted-foreground">
            Não registrado
          </span>
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
        <CardTitle className="text-base font-semibold">
          Origem & Captura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CaptureRow
          label="Primeira captura"
          tooltip="Canal pelo qual o contato entrou no CRM pela primeira vez."
          channel={firstCaptureChannel}
          date={firstCaptureAt}
        />
        <CaptureRow
          label="Última captura"
          tooltip="Canal mais recente pelo qual o contato interagiu ou foi recapturado."
          channel={lastCaptureChannel}
          date={lastCaptureAt}
        />
      </CardContent>
    </Card>
  )
}
