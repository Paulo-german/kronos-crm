'use client'

import { useRef, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Checkbox } from '@/_components/ui/checkbox'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Separator } from '@/_components/ui/separator'

import { setWorkingHours } from '@/_actions/working-hours/set-working-hours'
import { removeWorkingHours } from '@/_actions/working-hours/remove-working-hours'
import type { ProfessionalDetailDto } from '@/_data-access/professional/get-professional-by-id'

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
}

interface DayState {
  enabled: boolean
  startTime: string
  endTime: string
  hasExistingRecord: boolean
}

interface WorkingHoursTabProps {
  professional: ProfessionalDetailDto
}

const buildInitialDayStates = (
  workingHours: ProfessionalDetailDto['workingHours'],
): Record<number, DayState> => {
  const existingMap = new Map(
    workingHours.map((wh) => [wh.dayOfWeek, wh]),
  )

  const states: Record<number, DayState> = {}
  for (let day = 0; day <= 6; day++) {
    const existing = existingMap.get(day)
    states[day] = {
      enabled: existing !== undefined,
      startTime: existing?.startTime ?? '08:00',
      endTime: existing?.endTime ?? '18:00',
      hasExistingRecord: existing !== undefined,
    }
  }
  return states
}

const WorkingHoursTab = ({ professional }: WorkingHoursTabProps) => {
  const [dayStates, setDayStates] = useState<Record<number, DayState>>(
    () => buildInitialDayStates(professional.workingHours),
  )
  // Qual dia está aguardando resposta — ref evita problema de closure stale
  const pendingDayRef = useRef<number | null>(null)
  const [pendingDay, setPendingDay] = useState<number | null>(null)

  const { execute: executeSet } = useAction(setWorkingHours, {
    onSuccess: () => {
      const day = pendingDayRef.current
      if (day !== null) {
        toast.success(`Jornada de ${DAY_LABELS[day] ?? 'dia'} salva!`)
        setDayStates((prev) => ({
          ...prev,
          [day]: { ...prev[day]!, hasExistingRecord: true },
        }))
      }
      pendingDayRef.current = null
      setPendingDay(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar jornada.')
      pendingDayRef.current = null
      setPendingDay(null)
    },
  })

  const { execute: executeRemove } = useAction(removeWorkingHours, {
    onSuccess: () => {
      const day = pendingDayRef.current
      if (day !== null) {
        toast.success(`Jornada de ${DAY_LABELS[day] ?? 'dia'} removida.`)
        setDayStates((prev) => ({
          ...prev,
          [day]: { ...prev[day]!, hasExistingRecord: false },
        }))
      }
      pendingDayRef.current = null
      setPendingDay(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao remover jornada.')
      pendingDayRef.current = null
      setPendingDay(null)
    },
  })

  const handleToggleDay = (day: number, checked: boolean) => {
    setDayStates((prev) => ({
      ...prev,
      [day]: { ...prev[day]!, enabled: checked },
    }))
  }

  const handleTimeChange = (
    day: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setDayStates((prev) => ({
      ...prev,
      [day]: { ...prev[day]!, [field]: value },
    }))
  }

  const handleSaveDay = (day: number) => {
    const state = dayStates[day]
    if (!state) return

    if (state.enabled) {
      pendingDayRef.current = day
      setPendingDay(day)
      executeSet({
        professionalId: professional.id,
        dayOfWeek: day,
        startTime: state.startTime,
        endTime: state.endTime,
      })
      return
    }

    // Desabilitado e nunca teve registro — nada a fazer no servidor
    if (!state.hasExistingRecord) {
      toast.success(`${DAY_LABELS[day] ?? 'Dia'} marcado como inativo.`)
      return
    }

    // Desabilitado e tinha registro — remover
    pendingDayRef.current = day
    setPendingDay(day)
    executeRemove({
      professionalId: professional.id,
      dayOfWeek: day,
    })
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Jornada Semanal de Trabalho
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure os dias e horários de atendimento. Exceções por data específica
          podem ser adicionadas na aba &quot;Exceções&quot;.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {Array.from({ length: 7 }, (_, index) => {
          const day = index
          const state = dayStates[day]
          if (!state) return null
          const isSaving = pendingDay === day

          return (
            <div key={day}>
              <div className="flex items-center gap-4 py-3">
                <div className="flex w-36 shrink-0 items-center gap-2.5">
                  <Checkbox
                    id={`day-${day}`}
                    checked={state.enabled}
                    onCheckedChange={(checked) =>
                      handleToggleDay(day, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`day-${day}`}
                    className={`cursor-pointer select-none text-sm ${
                      state.enabled
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </Label>
                </div>

                <div
                  className={`flex items-center gap-2 transition-opacity ${
                    state.enabled
                      ? 'opacity-100'
                      : 'pointer-events-none opacity-40'
                  }`}
                >
                  <Input
                    type="time"
                    value={state.startTime}
                    onChange={(event) =>
                      handleTimeChange(day, 'startTime', event.target.value)
                    }
                    className="h-8 w-32 text-sm"
                    disabled={!state.enabled}
                    aria-label={`Início - ${DAY_LABELS[day]}`}
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={state.endTime}
                    onChange={(event) =>
                      handleTimeChange(day, 'endTime', event.target.value)
                    }
                    className="h-8 w-32 text-sm"
                    disabled={!state.enabled}
                    aria-label={`Fim - ${DAY_LABELS[day]}`}
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-8"
                  disabled={isSaving || pendingDay !== null}
                  onClick={() => handleSaveDay(day)}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Salvar</span>
                </Button>
              </div>
              {day < 6 && <Separator className="opacity-50" />}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default WorkingHoursTab
