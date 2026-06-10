'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface LastUpdatedLabelProps {
  isoTimestamp: string
}

export function LastUpdatedLabel({ isoTimestamp }: LastUpdatedLabelProps) {
  const date = new Date(isoTimestamp)
  return (
    <span className="text-xs text-muted-foreground">
      Atualizado em {format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
    </span>
  )
}
