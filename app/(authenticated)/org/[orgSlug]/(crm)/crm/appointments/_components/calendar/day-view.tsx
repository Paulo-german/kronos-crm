'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { CalendarNavHeader } from './calendar-shared'
import { DayTimeline } from './day-timeline'
import { useCalendarAppointmentState } from './use-calendar-appointment-state'
import { useCalendarDate } from './use-calendar-date'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'

const HOUR_HEIGHT_PX = 64

interface DayViewProps {
  appointments: AppointmentDto[]
  members: AcceptedMemberDto[]
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
}

export function DayView({
  appointments,
  members,
  contactOptions,
  services,
}: DayViewProps) {
  const { referenceDate, goToPrev, goToNext, goToToday } = useCalendarDate()

  const {
    statusOverrides,
    handleAppointmentClick,
    handleCreateForSlot,
    calendarPortals,
  } = useCalendarAppointmentState({ members, contactOptions, services })

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <CalendarNavHeader
          label={format(referenceDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          onPrev={() => goToPrev('day')}
          onNext={() => goToNext('day')}
          onToday={goToToday}
        />

        <div className="overflow-y-auto rounded-lg border bg-card p-2">
          <DayTimeline
            day={referenceDate}
            appointments={appointments}
            statusOverrides={statusOverrides}
            onAppointmentClick={handleAppointmentClick}
            onCreateSlot={handleCreateForSlot}
            hourHeight={HOUR_HEIGHT_PX}
            detailed
          />
        </div>

        {calendarPortals}
      </div>
    </TooltipProvider>
  )
}
