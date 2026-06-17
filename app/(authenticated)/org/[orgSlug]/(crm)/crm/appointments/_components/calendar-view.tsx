'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  getWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'
import { SAO_PAULO_TZ } from '@/_lib/appointment-utils'
import {
  AppointmentBlock,
  CalendarNavHeader,
  DayDots,
  DayPopoverContent,
  WEEKDAY_LABELS,
} from './calendar/calendar-shared'
import { useCalendarAppointmentState } from './calendar/use-calendar-appointment-state'
import { useCalendarDate } from './calendar/use-calendar-date'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'

// Máximo de blocos de appointment renderizados por célula antes do "+N mais"
const MAX_VISIBLE_PER_DAY = 3
// No mobile a célula é mais baixa — mostra menos badges
const MAX_VISIBLE_MOBILE = 2

interface CalendarViewProps {
  appointments: AppointmentDto[]
  members: AcceptedMemberDto[]
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
}

export function CalendarView({
  appointments,
  members,
  contactOptions,
  services,
}: CalendarViewProps) {
  const { referenceDate, goToPrev, goToNext, goToToday } = useCalendarDate()
  const currentMonth = referenceDate

  // Estado do popover aberto (ID do dia, ex: "yyyy-MM-dd")
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  const {
    statusOverrides,
    handleAppointmentClick,
    handleEditWithDealFocus,
    handleStatusSelect,
    handleCreateForDay,
    calendarPortals,
  } = useCalendarAppointmentState({ members, contactOptions, services })

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

  // Calcular a semana atual (para destacar a semana que contém hoje)
  const todayWeekNumber = useMemo(() => getWeek(new Date()), [])

  const handleCellClick = (day: Date, dayAppointments: AppointmentDto[]) => {
    if (dayAppointments.length === 0) {
      handleCreateForDay(day)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* Navegação do mês */}
        <CalendarNavHeader
          label={format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          onPrev={() => goToPrev('month')}
          onNext={() => goToNext('month')}
          onToday={goToToday}
        />

        {/* Grid do calendário */}
        <div className="rounded-lg border bg-card">
          {/* Cabeçalho: dias da semana */}
          <div className="grid grid-cols-7 border-b bg-secondary/20">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="px-1 py-2 text-center text-xs font-medium text-muted-foreground sm:px-2"
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
              const overflowCount = Math.max(
                0,
                dayAppointments.length - MAX_VISIBLE_PER_DAY,
              )
              const mobileOverflowCount = Math.max(
                0,
                dayAppointments.length - MAX_VISIBLE_MOBILE,
              )

              // Destaque para a semana que contém hoje
              const isCurrentWeek = getWeek(day) === todayWeekNumber
              const isPopoverOpen = openPopoverId === dayKey

              return (
                <div
                  key={dayKey}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'group min-h-[72px] border-b border-r p-1 transition-colors sm:min-h-[120px] sm:p-1.5',
                    // Remove borda direita do último item de cada linha
                    '[&:nth-child(7n)]:border-r-0',
                    // Remove borda inferior da última linha
                    'last-of-type:border-b-0',
                    !isCurrentMonthDay && 'bg-muted/30',
                    isTodayDay && 'bg-primary/5',
                    // Semana atual: fundo bem sutil + ring
                    isCurrentWeek &&
                      !isTodayDay &&
                      'bg-primary/[0.02] ring-1 ring-inset ring-primary/10',
                    // Hover: apenas dias sem appointments para indicar que são clicáveis
                    dayAppointments.length === 0 &&
                      isCurrentMonthDay &&
                      'cursor-pointer hover:bg-muted/50',
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
                            'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium transition-colors sm:h-6 sm:w-6 sm:text-xs',
                            !isCurrentMonthDay && 'text-muted-foreground',
                            isTodayDay && 'bg-primary text-primary-foreground',
                            !isTodayDay &&
                              isCurrentMonthDay &&
                              'cursor-pointer hover:bg-accent',
                          )}
                          onClick={(event) => {
                            event.stopPropagation()
                          }}
                        >
                          {format(day, 'd')}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto max-w-[calc(100vw-2rem)] p-0"
                        align="start"
                        sideOffset={4}
                      >
                        <DayPopoverContent
                          day={day}
                          dayAppointments={dayAppointments}
                          statusOverrides={statusOverrides}
                          onStatusSelect={handleStatusSelect}
                          onEditAppointment={handleAppointmentClick}
                          onEditWithDealFocus={handleEditWithDealFocus}
                          onCreateForDay={handleCreateForDay}
                          onClose={() => setOpenPopoverId(null)}
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Contador discreto de appointments */}
                    {dayAppointments.length > 0 && (
                      <span className="pr-0.5 pt-1 text-[9px] leading-none text-muted-foreground">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  {/* Dot indicators por status — apenas no desktop (mobile usa badges) */}
                  {dayAppointments.length > 0 && (
                    <div className="hidden sm:block">
                      <DayDots
                        appointments={dayAppointments}
                        statusOverrides={statusOverrides}
                      />
                    </div>
                  )}

                  {/* Badges de appointment — versão compacta no mobile, completa no desktop */}
                  <div className="mt-1 space-y-0.5">
                    {/* Mobile: até 2 badges para caber na célula compacta */}
                    <div className="space-y-0.5 sm:hidden">
                      {dayAppointments
                        .slice(0, MAX_VISIBLE_MOBILE)
                        .map((appointment) => (
                          <AppointmentBlock
                            key={appointment.id}
                            appointment={appointment}
                            statusOverrides={statusOverrides}
                            onClick={handleAppointmentClick}
                          />
                        ))}
                      {mobileOverflowCount > 0 && (
                        <button
                          type="button"
                          className="w-full text-left text-[9px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation()
                            setOpenPopoverId(dayKey)
                          }}
                        >
                          +{mobileOverflowCount}
                        </button>
                      )}
                    </div>

                    {/* Desktop: até 3 badges */}
                    <div className="hidden space-y-0.5 sm:block">
                      {dayAppointments
                        .slice(0, MAX_VISIBLE_PER_DAY)
                        .map((appointment) => (
                          <AppointmentBlock
                            key={appointment.id}
                            appointment={appointment}
                            statusOverrides={statusOverrides}
                            onClick={handleAppointmentClick}
                          />
                        ))}
                      {overflowCount > 0 && (
                        <button
                          type="button"
                          className="w-full text-left text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                </div>
              )
            })}
          </div>
        </div>

        {calendarPortals}
      </div>
    </TooltipProvider>
  )
}
