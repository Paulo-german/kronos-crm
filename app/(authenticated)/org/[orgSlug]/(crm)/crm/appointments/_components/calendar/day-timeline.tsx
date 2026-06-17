'use client'

import { useMemo } from 'react'
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HourAxis,
  HourGrid,
  TimelineBlock,
  getDayKeyInSP,
  layoutDayAppointments,
  slotToUtcRange,
} from './timeline-shared'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AppointmentStatus } from '@prisma/client'

interface DayTimelineProps {
  day: Date
  appointments: AppointmentDto[]
  statusOverrides: Record<string, AppointmentStatus>
  onAppointmentClick: (appointment: AppointmentDto) => void
  onCreateSlot: (startDate: Date, endDate: Date) => void
  hourHeight: number
  /** Mostra metadados extras nos blocos (visão de dia) */
  detailed?: boolean
}

/**
 * Grade vertical de um único dia (eixo de horas + blocos posicionados).
 * Reutilizada pela visão de Dia e pelo fallback mobile da visão de Semana.
 */
export function DayTimeline({
  day,
  appointments,
  statusOverrides,
  onAppointmentClick,
  onCreateSlot,
  hourHeight,
  detailed = false,
}: DayTimelineProps) {
  const dayKey = getDayKeyInSP(day)

  const dayAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => getDayKeyInSP(appointment.startDate) === dayKey,
      ),
    [appointments, dayKey],
  )

  const positioned = useMemo(
    () => layoutDayAppointments(dayAppointments, hourHeight),
    [dayAppointments, hourHeight],
  )

  const handleSlotClick = (clickedDayKey: string, hour: number) => {
    const { startDate, endDate } = slotToUtcRange(clickedDayKey, hour)
    onCreateSlot(startDate, endDate)
  }

  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * hourHeight

  return (
    <div className="flex">
      <HourAxis hourHeight={hourHeight} />
      <div className="relative flex-1" style={{ height: totalHeight }}>
        {/* Linhas de hora clicáveis (fundo) */}
        <div className="absolute inset-0">
          <HourGrid
            dayKey={dayKey}
            hourHeight={hourHeight}
            onSlotClick={handleSlotClick}
          />
        </div>
        {/* Blocos posicionados */}
        {positioned.map((item) => (
          <TimelineBlock
            key={item.appointment.id}
            positioned={item}
            statusOverrides={statusOverrides}
            onClick={onAppointmentClick}
            detailed={detailed}
          />
        ))}
      </div>
    </div>
  )
}
