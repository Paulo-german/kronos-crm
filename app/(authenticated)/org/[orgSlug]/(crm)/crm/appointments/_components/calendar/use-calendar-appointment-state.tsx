'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Sheet } from '@/_components/ui/sheet'
import { updateAppointment } from '@/_actions/appointment/update-appointment'
import { SAO_PAULO_TZ } from '@/_lib/appointment-utils'
import { UpsertAppointmentDialogContent } from '../upsert-dialog-content'
import { CancelBookingDealDialog } from '../cancel-booking-deal-dialog'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { AppointmentStatus } from '@prisma/client'

interface UseCalendarStateArgs {
  members: AcceptedMemberDto[]
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
}

interface CalendarAppointmentState {
  statusOverrides: Record<string, AppointmentStatus>
  handleAppointmentClick: (appointment: AppointmentDto) => void
  handleEditWithDealFocus: (appointment: AppointmentDto) => void
  handleStatusSelect: (
    appointmentId: string,
    newStatus: AppointmentStatus,
    appointment?: AppointmentDto,
  ) => void
  /** Cria agendamento num slot horário (Dates já em UTC) */
  handleCreateForSlot: (startDate: Date, endDate: Date) => void
  /** Cria agendamento para um dia inteiro (09:00–10:00 no fuso de SP) */
  handleCreateForDay: (date: Date) => void
  /** Sheets de edição/criação + dialog de cancelamento de BOOKING */
  calendarPortals: ReactNode
}

/**
 * Estado e handlers compartilhados pelas visões de calendário (mês/semana/dia):
 * Sheet de edição, Sheet de criação, status optimistic e o dialog de resolução
 * de deal ao cancelar um BOOKING. Cada view renderiza `calendarPortals` no fim
 * do JSX.
 */
export function useCalendarAppointmentState({
  members,
  contactOptions,
  services,
}: UseCalendarStateArgs): CalendarAppointmentState {
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  // Campo de foco programático ao abrir o Sheet (ex: 'dealId' para BOOKING sem negociação)
  const [editingFocusField, setEditingFocusField] = useState<
    'dealId' | undefined
  >(undefined)

  // Estado do Sheet de criação com data pré-preenchida
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [createDefaultDates, setCreateDefaultDates] = useState<{
    startDate: Date
    endDate: Date
  } | null>(null)

  // Optimistic status overrides para resolução rápida
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, AppointmentStatus>
  >({})

  // Estado do modal de resolução de deal ao cancelar BOOKING
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean
    appointmentId: string
    dealId: string
    dealTitle: string
    targetStatus: 'CANCELED' | 'NO_SHOW'
  } | null>(null)

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
  const { execute: executeUpdateStatus, isPending: isUpdatingStatus } =
    useAction(updateAppointment, {
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

  const handleAppointmentClick = useCallback((appointment: AppointmentDto) => {
    setEditingAppointment(appointment)
    setEditingFocusField(undefined)
    setIsEditSheetOpen(true)
  }, [])

  // Abre o Sheet de edição com foco direto no campo de deal (BOOKING sem negociação)
  const handleEditWithDealFocus = useCallback((appointment: AppointmentDto) => {
    setEditingAppointment(appointment)
    setEditingFocusField('dealId')
    setIsEditSheetOpen(true)
  }, [])

  const handleStatusSelect = useCallback(
    (
      appointmentId: string,
      newStatus: AppointmentStatus,
      appointment?: AppointmentDto,
    ) => {
      // Intercept CANCELED/NO_SHOW para BOOKING com deal em aberto
      if (
        appointment &&
        appointment.type === 'BOOKING' &&
        (newStatus === 'CANCELED' || newStatus === 'NO_SHOW') &&
        appointment.dealId &&
        appointment.dealTitle &&
        appointment.dealStatus === 'OPEN'
      ) {
        setCancelDialog({
          open: true,
          appointmentId,
          dealId: appointment.dealId,
          dealTitle: appointment.dealTitle,
          targetStatus: newStatus,
        })
        return
      }

      setStatusOverrides((prev) => ({ ...prev, [appointmentId]: newStatus }))
      executeUpdateStatus({ id: appointmentId, status: newStatus })
    },
    [executeUpdateStatus],
  )

  const handleCancelDialogConfirm = useCallback(
    (dealResolution: 'MARK_LOST' | 'KEEP_OPEN') => {
      if (!cancelDialog) return
      const { appointmentId, targetStatus } = cancelDialog
      setStatusOverrides((prev) => ({ ...prev, [appointmentId]: targetStatus }))
      executeUpdateStatus({
        id: appointmentId,
        status: targetStatus,
        dealResolution,
      })
      setCancelDialog(null)
    },
    [cancelDialog, executeUpdateStatus],
  )

  const handleCreateForSlot = useCallback((startDate: Date, endDate: Date) => {
    setCreateDefaultDates({ startDate, endDate })
    setIsCreateSheetOpen(true)
  }, [])

  const handleCreateForDay = useCallback(
    (date: Date) => {
      // Converter 09:00 e 10:00 no timezone de São Paulo para UTC
      const dayStr = formatInTimeZone(date, SAO_PAULO_TZ, 'yyyy-MM-dd')
      const startDate = fromZonedTime(`${dayStr}T09:00:00`, SAO_PAULO_TZ)
      const endDate = fromZonedTime(`${dayStr}T10:00:00`, SAO_PAULO_TZ)
      handleCreateForSlot(startDate, endDate)
    },
    [handleCreateForSlot],
  )

  const calendarPortals = (
    <>
      {/* Modal de resolução de deal ao cancelar BOOKING */}
      {cancelDialog && (
        <CancelBookingDealDialog
          open={cancelDialog.open}
          onOpenChange={(open) => {
            if (!open) setCancelDialog(null)
          }}
          dealTitle={cancelDialog.dealTitle}
          targetStatus={cancelDialog.targetStatus}
          isPending={isUpdatingStatus}
          onConfirm={handleCancelDialogConfirm}
        />
      )}

      {/* Sheet de edição (estado elevado para sobreviver ao re-render) */}
      <Sheet
        open={isEditSheetOpen}
        onOpenChange={(open) => {
          setIsEditSheetOpen(open)
          if (!open) {
            setEditingAppointment(null)
            setEditingFocusField(undefined)
          }
        }}
      >
        {editingAppointment && (
          <UpsertAppointmentDialogContent
            key={editingAppointment.id}
            defaultValues={editingAppointment}
            members={members}
            contactOptions={contactOptions}
            services={services}
            setIsOpen={setIsEditSheetOpen}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
            focusField={editingFocusField}
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
              type: 'MEETING',
              title: '',
              description: null,
              startDate: createDefaultDates.startDate,
              endDate: createDefaultDates.endDate,
              status: 'SCHEDULED',
              contactId: null,
              contactName: null,
              dealId: '',
              dealTitle: '',
              dealStatus: null,
              professionalId: null,
              serviceId: null,
              assignedTo: '',
              assigneeName: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            members={members}
            contactOptions={contactOptions}
            services={services}
            setIsOpen={setIsCreateSheetOpen}
          />
        )}
      </Sheet>
    </>
  )

  return {
    statusOverrides,
    handleAppointmentClick,
    handleEditWithDealFocus,
    handleStatusSelect,
    handleCreateForSlot,
    handleCreateForDay,
    calendarPortals,
  }
}
