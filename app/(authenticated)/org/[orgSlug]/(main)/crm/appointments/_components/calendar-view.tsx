'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  addMonths,
  subMonths,
  getWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import {
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
import { Sheet } from '@/_components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { updateAppointment } from '@/_actions/appointment/update-appointment'
import { UpsertAppointmentDialogContent } from './upsert-dialog-content'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { AppointmentStatus } from '@prisma/client'
import { STATUS_CALENDAR_COLORS } from '../_lib/appointment-filters'
import { STATUS_CONFIG, formatDuration } from '@/_lib/appointment-utils'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SAO_PAULO_TZ = 'America/Sao_Paulo'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Cores dos dots por status (Tailwind bg classes)
const STATUS_DOT_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-kronos-blue',
  IN_PROGRESS: 'bg-kronos-purple',
  COMPLETED: 'bg-kronos-green',
  CANCELED: 'bg-kronos-red',
  NO_SHOW: 'bg-kronos-yellow',
}

// Cores de fundo para o badge de status no hover preview
const STATUS_BADGE_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-kronos-blue/10 text-kronos-blue border-kronos-blue/20',
  IN_PROGRESS: 'bg-kronos-purple/10 text-kronos-purple border-kronos-purple/20',
  COMPLETED: 'bg-kronos-green/10 text-kronos-green border-kronos-green/20',
  CANCELED: 'bg-kronos-red/10 text-kronos-red border-kronos-red/20',
  NO_SHOW: 'bg-kronos-yellow/10 text-kronos-yellow border-kronos-yellow/20',
}

// Ícones de resolução rápida (mesma configuração do data-table)
const RESOLUTION_ACTIONS: Array<{
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
// Tipos
// ---------------------------------------------------------------------------

interface CalendarViewProps {
  appointments: AppointmentDto[]
  dealOptions: DealOptionDto[]
  members: AcceptedMemberDto[]
}

// ---------------------------------------------------------------------------
// Sub-componente: HoverPreview (tooltip com detalhes do appointment)
// ---------------------------------------------------------------------------

interface HoverPreviewProps {
  appointment: AppointmentDto
  currentStatus: AppointmentStatus
  children: React.ReactNode
}

function HoverPreview({ appointment, currentStatus, children }: HoverPreviewProps) {
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
        className="w-56 p-0 bg-popover text-popover-foreground border shadow-lg rounded-lg overflow-hidden"
      >
        <div className="p-3 space-y-2">
          {/* Título */}
          <p className="font-semibold text-xs leading-tight truncate">
            {appointment.title}
          </p>

          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn('text-[9px] px-1.5 py-0 h-4 font-medium', badgeColor)}
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
          {appointment.dealTitle && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <LinkIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{appointment.dealTitle}</span>
            </div>
          )}

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
// Sub-componente: AppointmentBlock (bloco visual no grid)
// ---------------------------------------------------------------------------

interface AppointmentBlockProps {
  appointment: AppointmentDto
  statusOverrides: Record<string, AppointmentStatus>
  onClick: (appointment: AppointmentDto) => void
}

function AppointmentBlock({
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
          'w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium transition-all hover:opacity-80 hover:shadow-sm',
          colorClass,
        )}
        onClick={(event) => {
          event.stopPropagation()
          onClick(appointment)
        }}
      >
        <span className="flex items-center gap-1">
          <span className="shrink-0">{startTime}</span>
          <span className="truncate">{appointment.title}</span>
        </span>
      </button>
    </HoverPreview>
  )
}

// ---------------------------------------------------------------------------
// Sub-componente: PopoverResolutionActions (ícones de resolução inline)
// ---------------------------------------------------------------------------

interface PopoverResolutionActionsProps {
  appointment: AppointmentDto
  statusOverrides: Record<string, AppointmentStatus>
  onStatusSelect: (appointmentId: string, newStatus: AppointmentStatus) => void
}

function PopoverResolutionActions({
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
// Sub-componente: DayPopoverContent (lista completa do dia)
// ---------------------------------------------------------------------------

interface DayPopoverContentProps {
  day: Date
  dayAppointments: AppointmentDto[]
  statusOverrides: Record<string, AppointmentStatus>
  onStatusSelect: (appointmentId: string, newStatus: AppointmentStatus) => void
  onEditAppointment: (appointment: AppointmentDto) => void
  onCreateForDay: (date: Date) => void
  onClose: () => void
}

function DayPopoverContent({
  day,
  dayAppointments,
  statusOverrides,
  onStatusSelect,
  onEditAppointment,
  onCreateForDay,
  onClose,
}: DayPopoverContentProps) {
  const dayLabel = format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })

  return (
    <div className="w-80">
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
                  className="flex items-start gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors"
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
                          currentStatus === 'CANCELED' && 'line-through opacity-60',
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
                          'text-[9px] px-1.5 py-0 h-4 font-medium',
                          badgeColor,
                        )}
                      >
                        {statusConfig.label}
                      </Badge>

                      {appointment.dealTitle && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <LinkIcon className="h-2.5 w-2.5" />
                          <span className="max-w-[80px] truncate">
                            {appointment.dealTitle}
                          </span>
                        </span>
                      )}

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
// Sub-componente: DayDots (dots de status abaixo do número do dia)
// ---------------------------------------------------------------------------

interface DayDotsProps {
  appointments: AppointmentDto[]
  statusOverrides: Record<string, AppointmentStatus>
}

function DayDots({ appointments, statusOverrides }: DayDotsProps) {
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
    <div className="flex items-center justify-center gap-0.5 mt-0.5">
      {uniqueStatuses.map((status) => (
        <span
          key={status}
          className={cn('h-1 w-1 rounded-full', STATUS_DOT_COLORS[status])}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal: CalendarView
// ---------------------------------------------------------------------------

export function CalendarView({
  appointments,
  dealOptions,
  members,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado do Sheet de criação com data pré-preenchida
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [createDefaultDates, setCreateDefaultDates] = useState<{
    startDate: Date
    endDate: Date
  } | null>(null)

  // Estado do popover aberto (ID do dia, ex: "yyyy-MM-dd")
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  // Optimistic status overrides para resolução rápida
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, AppointmentStatus>
  >({})

  // Hook para atualização completa (Sheet de edição)
  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateAppointment,
    {
      onSuccess: () => {
        toast.success('Agendamento atualizado com sucesso.')
        setIsEditSheetOpen(false)
        setEditingAppointment(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar agendamento.')
      },
    },
  )

  // Hook para atualização de status via resolução rápida (optimistic)
  const { execute: executeUpdateStatus } = useAction(updateAppointment, {
    onSuccess: () => {
      toast.success('Status atualizado com sucesso.')
    },
    onError: ({ error, input }) => {
      // Rollback do optimistic update
      setStatusOverrides((prev) => {
        const next = { ...prev }
        delete next[input.id]
        return next
      })
      toast.error(error.serverError || 'Erro ao atualizar status.')
    },
  })

  // Gerar todos os dias exibidos no grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Agrupar appointments por dia no timezone de São Paulo
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>()
    for (const appointment of appointments) {
      const dayKey = formatInTimeZone(
        new Date(appointment.startDate),
        SAO_PAULO_TZ,
        'yyyy-MM-dd',
      )
      const existing = map.get(dayKey) ?? []
      existing.push(appointment)
      map.set(dayKey, existing)
    }
    return map
  }, [appointments])

  // Calcular as semanas (para destacar a semana atual)
  const todayWeekNumber = useMemo(() => getWeek(new Date()), [])

  // Handlers memoizados
  const handleAppointmentClick = useCallback((appointment: AppointmentDto) => {
    setEditingAppointment(appointment)
    setIsEditSheetOpen(true)
  }, [])

  const handleStatusSelect = useCallback(
    (appointmentId: string, newStatus: AppointmentStatus) => {
      setStatusOverrides((prev) => ({ ...prev, [appointmentId]: newStatus }))
      executeUpdateStatus({ id: appointmentId, status: newStatus })
    },
    [executeUpdateStatus],
  )

  const handleCreateForDay = useCallback((date: Date) => {
    // Converter 09:00 e 10:00 no timezone de São Paulo para UTC
    const dayStr = formatInTimeZone(date, SAO_PAULO_TZ, 'yyyy-MM-dd')
    const startDate = fromZonedTime(`${dayStr}T09:00:00`, SAO_PAULO_TZ)
    const endDate = fromZonedTime(`${dayStr}T10:00:00`, SAO_PAULO_TZ)
    setCreateDefaultDates({ startDate, endDate })
    setIsCreateSheetOpen(true)
  }, [])

  const handleCellClick = useCallback(
    (day: Date, dayAppointments: AppointmentDto[]) => {
      if (dayAppointments.length === 0) {
        handleCreateForDay(day)
      }
    },
    [handleCreateForDay],
  )

  const goToPreviousMonth = useCallback(
    () => setCurrentMonth((prev) => subMonths(prev, 1)),
    [],
  )
  const goToNextMonth = useCallback(
    () => setCurrentMonth((prev) => addMonths(prev, 1)),
    [],
  )
  const goToToday = useCallback(() => setCurrentMonth(new Date()), [])

  return (
    <div className="flex flex-col gap-4">
      {/* Navegação do mês */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid do calendário */}
      <div className="rounded-lg border bg-card">
        {/* Cabeçalho: dias da semana */}
        <div className="grid grid-cols-7 border-b bg-secondary/20">
          {WEEKDAY_LABELS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Células de dias */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayAppointments = appointmentsByDay.get(dayKey) ?? []
            const isCurrentMonthDay = isSameMonth(day, currentMonth)
            const isTodayDay = isToday(day)
            const overflowCount = Math.max(0, dayAppointments.length - 3)

            // Destaque para a semana que contém hoje
            const isCurrentWeek = getWeek(day) === todayWeekNumber
            const isPopoverOpen = openPopoverId === dayKey

            return (
              <div
                key={dayKey}
                role="button"
                tabIndex={0}
                className={cn(
                  'group min-h-[120px] border-b border-r p-1.5 transition-colors',
                  // Remove borda direita do último item de cada linha
                  '[&:nth-child(7n)]:border-r-0',
                  // Remove borda inferior da última linha
                  'last-of-type:border-b-0',
                  !isCurrentMonthDay && 'bg-muted/30',
                  isTodayDay && 'bg-primary/5',
                  // Semana atual: fundo bem sutil + ring
                  isCurrentWeek &&
                    !isTodayDay &&
                    'bg-primary/[0.02] ring-inset ring-1 ring-primary/10',
                  // Hover: apenas dias sem appointments para indicar que são clicáveis
                  dayAppointments.length === 0 &&
                    isCurrentMonthDay &&
                    'hover:bg-muted/50 cursor-pointer',
                )}
                onClick={() => handleCellClick(day, dayAppointments)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    handleCellClick(day, dayAppointments)
                  }
                }}
              >
                {/* Número do dia + contador */}
                <div className="mb-1 flex items-start justify-between">
                  <Popover
                    open={isPopoverOpen}
                    onOpenChange={(open) => {
                      setOpenPopoverId(open ? dayKey : null)
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                          !isCurrentMonthDay && 'text-muted-foreground',
                          isTodayDay && 'bg-primary text-primary-foreground',
                          !isTodayDay &&
                            isCurrentMonthDay &&
                            'hover:bg-accent cursor-pointer',
                        )}
                        onClick={(event) => {
                          event.stopPropagation()
                        }}
                      >
                        {format(day, 'd')}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 w-auto"
                      align="start"
                      sideOffset={4}
                    >
                      <DayPopoverContent
                        day={day}
                        dayAppointments={dayAppointments}
                        statusOverrides={statusOverrides}
                        onStatusSelect={handleStatusSelect}
                        onEditAppointment={handleAppointmentClick}
                        onCreateForDay={handleCreateForDay}
                        onClose={() => setOpenPopoverId(null)}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Contador discreto de appointments */}
                  {dayAppointments.length > 0 && (
                    <span className="text-[9px] text-muted-foreground leading-none pt-1 pr-0.5">
                      {dayAppointments.length}
                    </span>
                  )}
                </div>

                {/* Dot indicators por status */}
                {dayAppointments.length > 0 && (
                  <DayDots
                    appointments={dayAppointments}
                    statusOverrides={statusOverrides}
                  />
                )}

                {/* Appointments do dia (máx 3) */}
                <div className="mt-1 space-y-0.5">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <AppointmentBlock
                      key={appointment.id}
                      appointment={appointment}
                      statusOverrides={statusOverrides}
                      onClick={handleAppointmentClick}
                    />
                  ))}

                  {/* "+N mais" clicável → abre o popover */}
                  {overflowCount > 0 && (
                    <button
                      type="button"
                      className="w-full text-left text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(event) => {
                        event.stopPropagation()
                        setOpenPopoverId(dayKey)
                      }}
                    >
                      +{overflowCount} mais
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sheet de edição (estado elevado para sobreviver ao re-render) */}
      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open)
          if (!open) setEditingAppointment(null)
        }}
      >
        {editingAppointment && (
          <UpsertAppointmentDialogContent
            key={editingAppointment.id}
            defaultValues={editingAppointment}
            dealOptions={dealOptions}
            members={members}
            setIsOpen={setIsEditSheetOpen}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      {/* Sheet de criação com data pré-preenchida */}
      <Sheet
        open={isCreateSheetOpen}
        onOpenChange={(open) => {
          setIsCreateSheetOpen(open)
          if (!open) setCreateDefaultDates(null)
        }}
      >
        {createDefaultDates && (
          <UpsertAppointmentDialogContent
            key={`create-${createDefaultDates.startDate.toISOString()}`}
            defaultValues={{
              id: '',
              title: '',
              description: null,
              startDate: createDefaultDates.startDate,
              endDate: createDefaultDates.endDate,
              status: 'SCHEDULED',
              dealId: '',
              dealTitle: '',
              assignedTo: '',
              assigneeName: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            dealOptions={dealOptions}
            members={members}
            setIsOpen={setIsCreateSheetOpen}
          />
        )}
      </Sheet>
    </div>
  )
}
