'use client'

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { cn } from '@/_lib/utils'
import { SAO_PAULO_TZ } from '@/_lib/appointment-utils'
import { STATUS_CALENDAR_COLORS } from '../../_lib/appointment-filters'
import { HoverPreview } from './calendar-shared'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AppointmentStatus } from '@prisma/client'

// ---------------------------------------------------------------------------
// Constantes da grade horária (visões de semana e dia)
// ---------------------------------------------------------------------------

export const DAY_START_HOUR = 6
export const DAY_END_HOUR = 22
const MINUTES_PER_HOUR = 60
const SLOT_DURATION_HOURS = 1
const MIN_BLOCK_HEIGHT_PX = 20

/** Lista de horas exibidas no eixo vertical (06:00 … 22:00) */
export const TIMELINE_HOURS: number[] = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, index) => DAY_START_HOUR + index,
)

/** Minutos desde a meia-noite no fuso de São Paulo */
function getMinutesInSP(date: Date): number {
  const hhmm = formatInTimeZone(new Date(date), SAO_PAULO_TZ, 'HH:mm')
  const [hours, minutes] = hhmm.split(':').map(Number)
  return hours * MINUTES_PER_HOUR + minutes
}

/** Chave do dia (yyyy-MM-dd) no fuso de São Paulo */
export function getDayKeyInSP(date: Date): string {
  return formatInTimeZone(new Date(date), SAO_PAULO_TZ, 'yyyy-MM-dd')
}

/**
 * Converte um clique numa hora vazia (dia + hora no fuso SP) num par de Dates
 * UTC para pré-preencher o Sheet de criação (slot de 1h).
 */
export function slotToUtcRange(
  dayKey: string,
  hour: number,
): { startDate: Date; endDate: Date } {
  const start = String(hour).padStart(2, '0')
  const end = String(hour + SLOT_DURATION_HOURS).padStart(2, '0')
  return {
    startDate: fromZonedTime(`${dayKey}T${start}:00:00`, SAO_PAULO_TZ),
    endDate: fromZonedTime(`${dayKey}T${end}:00:00`, SAO_PAULO_TZ),
  }
}

// ---------------------------------------------------------------------------
// Layout de sobreposição — atribui colunas a eventos concorrentes
// ---------------------------------------------------------------------------

export interface PositionedAppointment {
  appointment: AppointmentDto
  topPx: number
  heightPx: number
  leftPct: number
  widthPct: number
}

/**
 * Posiciona os appointments de um único dia numa timeline vertical, dividindo
 * a largura entre eventos que se sobrepõem no tempo (algoritmo simples de
 * colunas). Eventos fora da janela [DAY_START_HOUR, DAY_END_HOUR] são fixados
 * nas bordas. `hourHeight` é a altura em px de 1 hora.
 */
export function layoutDayAppointments(
  appointments: AppointmentDto[],
  hourHeight: number,
): PositionedAppointment[] {
  const minVisible = DAY_START_HOUR * MINUTES_PER_HOUR
  const maxVisible = DAY_END_HOUR * MINUTES_PER_HOUR

  const sorted = [...appointments].sort(
    (appointmentA, appointmentB) =>
      getMinutesInSP(appointmentA.startDate) -
      getMinutesInSP(appointmentB.startDate),
  )

  // Agrupa em clusters de eventos que se sobrepõem transitivamente
  const clusters: AppointmentDto[][] = []
  let current: AppointmentDto[] = []
  let clusterEnd = -1

  for (const appointment of sorted) {
    const startMin = getMinutesInSP(appointment.startDate)
    const endMin = getMinutesInSP(appointment.endDate)
    if (current.length > 0 && startMin >= clusterEnd) {
      clusters.push(current)
      current = []
      clusterEnd = -1
    }
    current.push(appointment)
    clusterEnd = Math.max(clusterEnd, endMin)
  }
  if (current.length > 0) clusters.push(current)

  const positioned: PositionedAppointment[] = []

  for (const cluster of clusters) {
    // Atribui cada evento à primeira coluna livre
    const columnEnds: number[] = []
    const columnOf = new Map<string, number>()

    for (const appointment of cluster) {
      const startMin = getMinutesInSP(appointment.startDate)
      const endMin = getMinutesInSP(appointment.endDate)
      let assigned = columnEnds.findIndex((end) => startMin >= end)
      if (assigned === -1) {
        assigned = columnEnds.length
        columnEnds.push(endMin)
      } else {
        columnEnds[assigned] = endMin
      }
      columnOf.set(appointment.id, assigned)
    }

    const totalColumns = columnEnds.length
    const widthPct = 100 / totalColumns

    for (const appointment of cluster) {
      const startMin = Math.max(
        minVisible,
        Math.min(getMinutesInSP(appointment.startDate), maxVisible),
      )
      const endMin = Math.max(
        startMin,
        Math.min(getMinutesInSP(appointment.endDate), maxVisible),
      )
      const column = columnOf.get(appointment.id) ?? 0

      positioned.push({
        appointment,
        topPx: ((startMin - minVisible) / MINUTES_PER_HOUR) * hourHeight,
        heightPx: Math.max(
          ((endMin - startMin) / MINUTES_PER_HOUR) * hourHeight,
          MIN_BLOCK_HEIGHT_PX,
        ),
        leftPct: column * widthPct,
        widthPct,
      })
    }
  }

  return positioned
}

// ---------------------------------------------------------------------------
// HourAxis — coluna fixa com os rótulos de hora
// ---------------------------------------------------------------------------

export function HourAxis({ hourHeight }: { hourHeight: number }) {
  return (
    <div className="w-12 shrink-0 sm:w-14">
      {TIMELINE_HOURS.map((hour) => (
        <div key={hour} style={{ height: hourHeight }} className="relative">
          <span className="absolute -top-2 right-1 text-[10px] tabular-nums text-muted-foreground">
            {String(hour).padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HourGrid — linhas horizontais clicáveis (cria appointment no slot)
// ---------------------------------------------------------------------------

interface HourGridProps {
  dayKey: string
  hourHeight: number
  onSlotClick: (dayKey: string, hour: number) => void
}

export function HourGrid({ dayKey, hourHeight, onSlotClick }: HourGridProps) {
  return (
    <>
      {TIMELINE_HOURS.map((hour) => (
        <button
          key={hour}
          type="button"
          style={{ height: hourHeight }}
          className="block w-full border-b border-border/60 transition-colors hover:bg-muted/40"
          onClick={() => onSlotClick(dayKey, hour)}
          aria-label={`Criar agendamento às ${String(hour).padStart(2, '0')}:00`}
        />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// TimelineBlock — bloco posicionado de um appointment
// ---------------------------------------------------------------------------

interface TimelineBlockProps {
  positioned: PositionedAppointment
  statusOverrides: Record<string, AppointmentStatus>
  onClick: (appointment: AppointmentDto) => void
  /** Mostra metadados extras (responsável) — usado na visão de dia */
  detailed?: boolean
}

export function TimelineBlock({
  positioned,
  statusOverrides,
  onClick,
  detailed = false,
}: TimelineBlockProps) {
  const { appointment, topPx, heightPx, leftPct, widthPct } = positioned
  const currentStatus = (statusOverrides[appointment.id] ??
    appointment.status) as AppointmentStatus
  const colorClass = STATUS_CALENDAR_COLORS[currentStatus]

  const startTime = formatInTimeZone(
    new Date(appointment.startDate),
    SAO_PAULO_TZ,
    'HH:mm',
  )
  const endTime = formatInTimeZone(
    new Date(appointment.endDate),
    SAO_PAULO_TZ,
    'HH:mm',
  )

  return (
    <div
      className="absolute px-0.5"
      style={{
        top: topPx,
        height: heightPx,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      }}
    >
      <HoverPreview appointment={appointment} currentStatus={currentStatus}>
        <button
          type="button"
          className={cn(
            'flex h-full w-full flex-col overflow-hidden rounded px-1.5 py-1 text-left text-[10px] font-medium transition-all hover:opacity-90 hover:shadow-sm',
            colorClass,
          )}
          onClick={(event) => {
            event.stopPropagation()
            onClick(appointment)
          }}
        >
          <span className="truncate font-semibold">{appointment.title}</span>
          <span className="truncate tabular-nums opacity-80">
            {startTime}–{endTime}
          </span>
          {detailed && appointment.assigneeName && (
            <span className="truncate opacity-80">
              {appointment.assigneeName}
            </span>
          )}
        </button>
      </HoverPreview>
    </div>
  )
}
