'use client'

import { useMemo } from 'react'
import { format, isToday, isFuture, isPast, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Clock, User, Phone, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Separator } from '@/_components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import type { ProfessionalDetailDto } from '@/_data-access/professional/get-professional-by-id'
import type { ProfessionalAppointmentDto } from '@/_data-access/professional/get-professional-appointments'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Agendado', variant: 'secondary' as const, icon: Clock },
  COMPLETED: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle2 },
  CANCELED: { label: 'Cancelado', variant: 'destructive' as const, icon: XCircle },
  NO_SHOW: { label: 'Não compareceu', variant: 'outline' as const, icon: AlertCircle },
  IN_PROGRESS: { label: 'Em andamento', variant: 'default' as const, icon: Clock },
}

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
})

interface ProfessionalPortalViewProps {
  professional: ProfessionalDetailDto
  appointments: ProfessionalAppointmentDto[]
  orgSlug: string
}

export function ProfessionalPortalView({
  professional,
  appointments,
}: ProfessionalPortalViewProps) {
  const { todayAppointments, upcomingAppointments, pastAppointments } = useMemo(() => {
    return {
      todayAppointments: appointments.filter((a) => isToday(a.startDate)),
      upcomingAppointments: appointments.filter(
        (a) => isFuture(startOfDay(a.startDate)) && !isToday(a.startDate),
      ),
      pastAppointments: appointments
        .filter((a) => isPast(startOfDay(a.startDate)) && !isToday(a.startDate))
        .slice(-10)
        .reverse(),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments])

  const initials = professional.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-6">
      {/* Header do profissional */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          {professional.avatarUrl && (
            <AvatarImage src={professional.avatarUrl} alt={professional.name} />
          )}
          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{professional.name}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Resumo rápido */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayAppointments.length}</p>
            <p className="text-xs text-muted-foreground">agendamento(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{upcomingAppointments.length}</p>
            <p className="text-xs text-muted-foreground">agendamento(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{professional.professionalServices.length}</p>
            <p className="text-xs text-muted-foreground">serviço(s) disponível(is)</p>
          </CardContent>
        </Card>
      </div>

      {/* Agendamentos de hoje */}
      {todayAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Próximos agendamentos */}
      {upcomingAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Próximos agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppointments.map((appointment, index) => (
              <div key={appointment.id}>
                {index > 0 &&
                  !isSameDay(
                    upcomingAppointments[index - 1].startDate,
                    appointment.startDate,
                  ) && (
                    <div className="py-1">
                      <Separator />
                    </div>
                  )}
                <AppointmentRow appointment={appointment} showDate />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sem agendamentos */}
      {todayAppointments.length === 0 && upcomingAppointments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Nenhum agendamento</p>
            <p className="text-sm text-muted-foreground/60">
              Sua agenda está livre por enquanto.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Jornada de trabalho */}
      {professional.workingHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jornada de trabalho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {professional.workingHours.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">{DAY_NAMES[wh.dayOfWeek]}</span>
                  <span className="text-muted-foreground">
                    {wh.startTime} – {wh.endTime}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico recente */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Histórico recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} showDate muted />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

interface AppointmentRowProps {
  appointment: ProfessionalAppointmentDto
  showDate?: boolean
  muted?: boolean
}

function AppointmentRow({ appointment, showDate, muted }: AppointmentRowProps) {
  const config = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.SCHEDULED
  const StatusIcon = config.icon

  return (
    <div className={`flex items-start gap-3 rounded-md border p-3 ${muted ? 'opacity-60' : ''}`}>
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <StatusIcon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-sm">{appointment.title}</p>
          <Badge variant={config.variant} className="shrink-0 text-xs">
            {config.label}
          </Badge>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {showDate && (
              <span>
                {format(appointment.startDate, "dd/MM", { locale: ptBR })} •{' '}
              </span>
            )}
            {timeFormatter.format(appointment.startDate)} –{' '}
            {timeFormatter.format(appointment.endDate)}
          </span>

          {appointment.contact && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {appointment.contact.name}
            </span>
          )}

          {appointment.contact?.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {appointment.contact.phone}
            </span>
          )}

          {appointment.service && (
            <span className="text-muted-foreground/80">
              {appointment.service.name} • {appointment.service.duration}min
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
