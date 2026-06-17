'use client'

import { useMemo, useState } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'
import { CalendarNavHeader, WEEKDAY_LABELS } from './calendar-shared'
import { DayTimeline } from './day-timeline'
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
import { useCalendarAppointmentState } from './use-calendar-appointment-state'
import { useCalendarDate } from './use-calendar-date'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { AppointmentStatus } from '@prisma/client'

const HOUR_HEIGHT_PX = 56

interface WeekViewProps {
  appointments: AppointmentDto[]
  members: AcceptedMemberDto[]
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
}

// ---------------------------------------------------------------------------
// Coluna de um dia na grade semanal (desktop) — sem eixo de horas próprio
// ---------------------------------------------------------------------------

interface WeekDayColumnProps {
  day: Date
  appointments: AppointmentDto[]
  statusOverrides: Record<string, AppointmentStatus>
  onAppointmentClick: (appointment: AppointmentDto) => void
  onCreateSlot: (startDate: Date, endDate: Date) => void
}

function WeekDayColumn({
  day,
  appointments,
  statusOverrides,
  onAppointmentClick,
  onCreateSlot,
}: WeekDayColumnProps) {
  const dayKey = getDayKeyInSP(day)

  const dayAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => getDayKeyInSP(appointment.startDate) === dayKey,
      ),
    [appointments, dayKey],
  )

  const positioned = useMemo(
    () => layoutDayAppointments(dayAppointments, HOUR_HEIGHT_PX),
    [dayAppointments],
  )

  const handleSlotClick = (clickedDayKey: string, hour: number) => {
    const { startDate, endDate } = slotToUtcRange(clickedDayKey, hour)
    onCreateSlot(startDate, endDate)
  }

  return (
    <div className="relative border-r border-border/60 last:border-r-0">
      <div className="absolute inset-0">
        <HourGrid
          dayKey={dayKey}
          hourHeight={HOUR_HEIGHT_PX}
          onSlotClick={handleSlotClick}
        />
      </div>
      {positioned.map((item) => (
        <TimelineBlock
          key={item.appointment.id}
          positioned={item}
          statusOverrides={statusOverrides}
          onClick={onAppointmentClick}
        />
      ))}
    </div>
  )
}

export function WeekView({
  appointments,
  members,
  contactOptions,
  services,
}: WeekViewProps) {
  const { referenceDate, goToPrev, goToNext, goToToday } = useCalendarDate()

  const {
    statusOverrides,
    handleAppointmentClick,
    handleCreateForSlot,
    calendarPortals,
  } = useCalendarAppointmentState({ members, contactOptions, services })

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [referenceDate])

  // Dia selecionado no fallback mobile (default = dia de referência)
  const [selectedMobileDay, setSelectedMobileDay] = useState(referenceDate)

  // Se a semana mudou (navegação ‹ ›) e o dia selecionado não pertence mais a
  // ela, cai de volta no dia de referência — evita pill órfão fora da semana.
  const effectiveMobileDay = weekDays.some((day) =>
    isSameDay(day, selectedMobileDay),
  )
    ? selectedMobileDay
    : referenceDate

  const label = `${format(weekDays[0], 'dd MMM', { locale: ptBR })} – ${format(
    weekDays[6],
    'dd MMM',
    { locale: ptBR },
  )}`

  const totalHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT_PX

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <CalendarNavHeader
          label={label}
          onPrev={() => goToPrev('week')}
          onNext={() => goToNext('week')}
          onToday={goToToday}
        />

        {/* Desktop: grade de 7 colunas */}
        <div className="hidden overflow-y-auto rounded-lg border bg-card sm:block">
          {/* Cabeçalho dos dias (alinhado ao eixo de horas via spacer) */}
          <div className="flex border-b bg-secondary/20">
            <div className="w-12 shrink-0 sm:w-14" />
            <div className="grid flex-1 grid-cols-7">
              {weekDays.map((day) => {
                const isTodayDay = isToday(day)
                return (
                  <div
                    key={day.toISOString()}
                    className="flex flex-col items-center gap-0.5 py-2 text-center"
                  >
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">
                      {WEEKDAY_LABELS[day.getDay()]}
                    </span>
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                        isTodayDay && 'bg-primary text-primary-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Corpo: eixo de horas + colunas */}
          <div className="flex">
            <HourAxis hourHeight={HOUR_HEIGHT_PX} />
            <div
              className="grid flex-1 grid-cols-7"
              style={{ height: totalHeight }}
            >
              {weekDays.map((day) => (
                <WeekDayColumn
                  key={day.toISOString()}
                  day={day}
                  appointments={appointments}
                  statusOverrides={statusOverrides}
                  onAppointmentClick={handleAppointmentClick}
                  onCreateSlot={handleCreateForSlot}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: pills de dias + timeline do dia selecionado */}
        <div className="sm:hidden">
          <div className="mb-3 flex items-center justify-between gap-1">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, effectiveMobileDay)
              const isTodayDay = isToday(day)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedMobileDay(day)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  <span className="text-[9px] font-medium uppercase opacity-80">
                    {WEEKDAY_LABELS[day.getDay()]}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums',
                      !isSelected && isTodayDay && 'text-primary',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="overflow-y-auto rounded-lg border bg-card p-2">
            <DayTimeline
              day={effectiveMobileDay}
              appointments={appointments}
              statusOverrides={statusOverrides}
              onAppointmentClick={handleAppointmentClick}
              onCreateSlot={handleCreateForSlot}
              hourHeight={HOUR_HEIGHT_PX}
            />
          </div>
        </div>

        {calendarPortals}
      </div>
    </TooltipProvider>
  )
}
