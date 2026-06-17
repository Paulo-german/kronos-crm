'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircle2Icon,
  ChevronLeft,
  ChevronRight,
  LinkIcon,
  PlusIcon,
  TimerIcon,
  UserIcon,
  UserXIcon,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'
import {
  SAO_PAULO_TZ,
  STATUS_CONFIG,
  formatDuration,
} from '@/_lib/appointment-utils'
import { STATUS_CALENDAR_COLORS } from '../../_lib/appointment-filters'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AppointmentStatus } from '@prisma/client'

// ---------------------------------------------------------------------------
// Constantes compartilhadas pelas visões de calendário (mês / semana / dia)
// ---------------------------------------------------------------------------

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Cores dos dots por status (Tailwind bg classes)
export const STATUS_DOT_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-kronos-blue',
  IN_PROGRESS: 'bg-kronos-purple',
  COMPLETED: 'bg-kronos-green',
  CANCELED: 'bg-kronos-red',
  NO_SHOW: 'bg-kronos-yellow',
}

// Cores de fundo para o badge de status no hover preview
export const STATUS_BADGE_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-kronos-blue/10 text-kronos-blue border-kronos-blue/20',
  IN_PROGRESS: 'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20',
  COMPLETED: 'bg-kronos-green/10 text-kronos-green border-kronos-green/20',
  CANCELED: 'bg-kronos-red/10 text-kronos-red border-kronos-red/20',
  NO_SHOW: 'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20',
}

// Configuração dos 3 botões de resolução rápida (reusada por timeline e calendário)
export const RESOLUTION_ACTIONS: Array<{
  status: AppointmentStatus
  icon: typeof CheckCircle2Icon
  label: string
  color: string
  activeColor: string
}> = [
  {
    status: 'COMPLETED',
    icon: CheckCircle2Icon,
    label: 'Concluído',
    color:
      'text-muted-foreground/50 hover:text-kronos-green hover:bg-kronos-green/10',
    activeColor: 'text-kronos-green bg-kronos-green/15',
  },
  {
    status: 'CANCELED',
    icon: BanIcon,
    label: 'Cancelado',
    color:
      'text-muted-foreground/50 hover:text-kronos-red hover:bg-kronos-red/10',
    activeColor: 'text-kronos-red bg-kronos-red/15',
  },
  {
    status: 'NO_SHOW',
    icon: UserXIcon,
    label: 'Não Compareceu',
    color:
      'text-muted-foreground/50 hover:text-kronos-yellow hover:bg-kronos-yellow/10',
    activeColor: 'text-kronos-yellow bg-kronos-yellow/15',
  },
]

// ---------------------------------------------------------------------------
// CalendarNavHeader — barra de navegação ‹ Hoje › compartilhada pelas 3 views
// ---------------------------------------------------------------------------

interface CalendarNavHeaderProps {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function CalendarNavHeader({
  label,
  onPrev,
  onNext,
  onToday,
}: CalendarNavHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-base font-semibold capitalize sm:text-lg">{label}</h3>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          Hoje
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HoverPreview — tooltip com detalhes do appointment
// ---------------------------------------------------------------------------

interface HoverPreviewProps {
  appointment: AppointmentDto
  currentStatus: AppointmentStatus
  children: React.ReactNode
}

export function HoverPreview({
  appointment,
  currentStatus,
  children,
}: HoverPreviewProps) {
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
  const duration = formatDuration(appointment.startDate, appointment.endDate)
  const statusConfig = STATUS_CONFIG[currentStatus]
  const badgeColor = STATUS_BADGE_COLORS[currentStatus]

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="w-56 overflow-hidden rounded-lg border bg-popover p-0 text-popover-foreground shadow-lg"
      >
        <div className="space-y-2 p-3">
          {/* Título */}
          <p className="truncate text-xs font-semibold leading-tight">
            {appointment.title}
          </p>

          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn('h-4 px-1.5 py-0 text-[9px] font-medium', badgeColor)}
          >
            {statusConfig.label}
          </Badge>

          {/* Horário + duração */}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <TimerIcon className="h-3 w-3 shrink-0" />
            <span>
              {startTime} - {endTime} ({duration})
            </span>
          </div>

          {/* Deal */}
          {appointment.dealTitle ? (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <LinkIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{appointment.dealTitle}</span>
            </div>
          ) : appointment.type === 'BOOKING' ? (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangleIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">Sem negociação vinculada</span>
            </div>
          ) : null}

          {/* Responsável */}
          {appointment.assigneeName && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <UserIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{appointment.assigneeName}</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// AppointmentBlock — bloco visual compacto (célula do mês)
// ---------------------------------------------------------------------------

interface AppointmentBlockProps {
  appointment: AppointmentDto
  statusOverrides: Record<string, AppointmentStatus>
  onClick: (appointment: AppointmentDto) => void
}

export function AppointmentBlock({
  appointment,
  statusOverrides,
  onClick,
}: AppointmentBlockProps) {
  const currentStatus = (statusOverrides[appointment.id] ??
    appointment.status) as AppointmentStatus

  // STATUS_CALENDAR_COLORS já inclui line-through e opacity para CANCELED/NO_SHOW
  const colorClass = STATUS_CALENDAR_COLORS[currentStatus]

  const startTime = formatInTimeZone(
    new Date(appointment.startDate),
    SAO_PAULO_TZ,
    'HH:mm',
  )

  return (
    <HoverPreview appointment={appointment} currentStatus={currentStatus}>
      <button
        type="button"
        className={cn(
          'w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium transition-all hover:opacity-80 hover:shadow-sm sm:px-1.5 sm:text-[10px]',
          colorClass,
        )}
        onClick={(event) => {
          event.stopPropagation()
          onClick(appointment)
        }}
      >
        <span className="flex items-center gap-1">
          {/* Horário fica oculto no mobile para o título caber no badge compacto */}
          <span className="hidden shrink-0 sm:inline">{startTime}</span>
          <span className="truncate">{appointment.title}</span>
          {appointment.type === 'BOOKING' && !appointment.dealId && (
            <AlertTriangleIcon className="h-3 w-3 shrink-0 text-amber-500" />
          )}
        </span>
      </button>
    </HoverPreview>
  )
}

// ---------------------------------------------------------------------------
// PopoverResolutionActions — ícones de resolução rápida inline
// ---------------------------------------------------------------------------

interface PopoverResolutionActionsProps {
  appointment: AppointmentDto
  statusOverrides: Record<string, AppointmentStatus>
  onStatusSelect: (
    appointmentId: string,
    newStatus: AppointmentStatus,
    appointment?: AppointmentDto,
  ) => void
}

export function PopoverResolutionActions({
  appointment,
  statusOverrides,
  onStatusSelect,
}: PopoverResolutionActionsProps) {
  const currentStatus = (statusOverrides[appointment.id] ??
    appointment.status) as AppointmentStatus

  return (
    <div className="flex items-center gap-0.5">
      {RESOLUTION_ACTIONS.map((action) => {
        const Icon = action.icon
        const isActive = currentStatus === action.status

        return (
          <Tooltip key={action.status}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded transition-colors',
                  isActive ? action.activeColor : action.color,
                )}
                onClick={(event) => {
                  event.stopPropagation()
                  onStatusSelect(
                    appointment.id,
                    isActive ? 'SCHEDULED' : action.status,
                    appointment,
                  )
                }}
              >
                <Icon className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isActive ? 'Voltar para Agendado' : action.label}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DayPopoverContent — lista completa de um dia
// ---------------------------------------------------------------------------

interface DayPopoverContentProps {
  day: Date
  dayAppointments: AppointmentDto[]
  statusOverrides: Record<string, AppointmentStatus>
  onStatusSelect: (
    appointmentId: string,
    newStatus: AppointmentStatus,
    appointment?: AppointmentDto,
  ) => void
  onEditAppointment: (appointment: AppointmentDto) => void
  onEditWithDealFocus: (appointment: AppointmentDto) => void
  onCreateForDay: (date: Date) => void
  onClose: () => void
}

export function DayPopoverContent({
  day,
  dayAppointments,
  statusOverrides,
  onStatusSelect,
  onEditAppointment,
  onEditWithDealFocus,
  onCreateForDay,
  onClose,
}: DayPopoverContentProps) {
  const dayLabel = format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })

  return (
    <div className="w-[calc(100vw-2rem)] max-w-80 sm:w-80">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-semibold capitalize text-foreground">
          {dayLabel}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {dayAppointments.length} agendamento
          {dayAppointments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista de appointments */}
      <div className="max-h-72 overflow-y-auto">
        {dayAppointments.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            Nenhum agendamento neste dia.
          </div>
        ) : (
          <div className="divide-y">
            {dayAppointments.map((appointment) => {
              const currentStatus = (statusOverrides[appointment.id] ??
                appointment.status) as AppointmentStatus
              const statusConfig = STATUS_CONFIG[currentStatus]
              const badgeColor = STATUS_BADGE_COLORS[currentStatus]

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
                  key={appointment.id}
                  className="flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  {/* Coluna de hora */}
                  <div className="w-16 shrink-0 pt-0.5">
                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {startTime} - {endTime}
                    </span>
                  </div>

                  {/* Info principal */}
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => {
                        onEditAppointment(appointment)
                        onClose()
                      }}
                    >
                      <p
                        className={cn(
                          'truncate text-xs font-medium leading-tight hover:underline',
                          currentStatus === 'CANCELED' &&
                            'line-through opacity-60',
                          currentStatus === 'NO_SHOW' && 'opacity-60',
                        )}
                      >
                        {appointment.title}
                      </p>
                    </button>

                    {/* Metadados */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-4 px-1.5 py-0 text-[9px] font-medium',
                          badgeColor,
                        )}
                      >
                        {statusConfig.label}
                      </Badge>

                      {appointment.dealTitle ? (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <LinkIcon className="h-2.5 w-2.5" />
                          <span className="max-w-[80px] truncate">
                            {appointment.dealTitle}
                          </span>
                        </span>
                      ) : appointment.type === 'BOOKING' ? (
                        // BOOKING sem negociação vinculada — alerta clicável para vincular
                        <button
                          type="button"
                          className="flex items-center gap-0.5 text-[10px] text-amber-600 hover:underline dark:text-amber-400"
                          onClick={(event) => {
                            event.stopPropagation()
                            onEditWithDealFocus(appointment)
                            onClose()
                          }}
                        >
                          <AlertTriangleIcon className="h-2.5 w-2.5 shrink-0" />
                          <span>Sem negociação</span>
                        </button>
                      ) : null}

                      {appointment.assigneeName && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <UserIcon className="h-2.5 w-2.5" />
                          <span className="max-w-[80px] truncate">
                            {appointment.assigneeName}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ícones de resolução rápida */}
                  <div className="shrink-0 pt-0.5">
                    <PopoverResolutionActions
                      appointment={appointment}
                      statusOverrides={statusOverrides}
                      onStatusSelect={onStatusSelect}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer: botão de criar */}
      <div className="border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            onCreateForDay(day)
            onClose()
          }}
        >
          <PlusIcon className="h-3 w-3" />
          Novo Agendamento
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DayDots — dots de status abaixo do número do dia (célula do mês)
// ---------------------------------------------------------------------------

interface DayDotsProps {
  appointments: AppointmentDto[]
  statusOverrides: Record<string, AppointmentStatus>
}

export function DayDots({ appointments, statusOverrides }: DayDotsProps) {
  // Coletar status únicos (com override aplicado), máximo 3 dots
  const uniqueStatuses = useMemo(() => {
    const seen = new Set<AppointmentStatus>()
    for (const appointment of appointments) {
      const status = (statusOverrides[appointment.id] ??
        appointment.status) as AppointmentStatus
      seen.add(status)
      if (seen.size >= 3) break
    }
    return Array.from(seen)
  }, [appointments, statusOverrides])

  if (uniqueStatuses.length === 0) return null

  return (
    <div className="mt-0.5 flex items-center justify-center gap-0.5">
      {uniqueStatuses.map((status) => (
        <span
          key={status}
          className={cn('h-1 w-1 rounded-full', STATUS_DOT_COLORS[status])}
        />
      ))}
    </div>
  )
}
