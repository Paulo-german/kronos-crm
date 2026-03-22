'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  AlertTriangleIcon,
  BanIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronDown,
  LinkIcon,
  TimerIcon,
  TrashIcon,
  UserIcon,
  UserXIcon,
} from 'lucide-react'
import Link from 'next/link'
import { Sheet } from '@/_components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { formatInTimeZone } from 'date-fns-tz'
import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { updateAppointment } from '@/_actions/appointment/update-appointment'
import { deleteAppointment } from '@/_actions/appointment/delete-appointment'
import { UpsertAppointmentDialogContent } from './upsert-dialog-content'
import AppointmentTableDropdownMenu from './table-dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { AppointmentStatus } from '@prisma/client'
import { formatDuration } from '@/_lib/appointment-utils'
import { Button } from '@/_components/ui/button'
import { cn } from '@/_lib/utils'

const SAO_PAULO_TZ = 'America/Sao_Paulo'

interface AppointmentsDataTableProps {
  appointments: AppointmentDto[]
  dealOptions: DealOptionDto[]
  members: AcceptedMemberDto[]
}

// Tipo da seção (determina visual e comportamento)
type SectionType = 'pending' | 'in-progress' | 'today' | 'upcoming' | 'past'

interface DayGroup {
  label: string
  key: string
  appointments: AppointmentDto[]
  type: SectionType
}

/**
 * Extrai a data (yyyy-MM-dd) no timezone de São Paulo
 */
function getDayKeyInSP(date: Date): string {
  return formatInTimeZone(date, SAO_PAULO_TZ, 'yyyy-MM-dd')
}

/**
 * Retorna o label legível para um grupo de dia (Hoje, Amanhã ou data formatada)
 */
function getDayGroupLabel(dayKey: string): string {
  const todayKey = getDayKeyInSP(new Date())
  const tomorrowKey = getDayKeyInSP(addDays(new Date(), 1))

  if (dayKey === todayKey) return 'Hoje'
  if (dayKey === tomorrowKey) return 'Amanhã'

  const [year, month, day] = dayKey.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  return format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })
}

const FINISHED_STATUSES: AppointmentStatus[] = ['COMPLETED', 'CANCELED', 'NO_SHOW']

function sortByStartDate(list: AppointmentDto[]): AppointmentDto[] {
  return [...list].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  )
}

/**
 * Agrupa appointments em 5 seções baseadas em data + status:
 *
 * 1. Pendentes de Atualização — SCHEDULED com data passada (alerta)
 * 2. Em Andamento — IN_PROGRESS (qualquer data)
 * 3. Hoje — SCHEDULED com data = hoje
 * 4. Próximos — SCHEDULED com data futura (agrupado por dia)
 * 5. Anteriores — COMPLETED / CANCELED / NO_SHOW (qualquer data, colapsado)
 */
function groupAppointmentsBySection(appointments: AppointmentDto[]): DayGroup[] {
  const todayKey = getDayKeyInSP(new Date())

  const pending: AppointmentDto[] = []
  const inProgress: AppointmentDto[] = []
  const finished: AppointmentDto[] = []
  const scheduledByDay = new Map<string, AppointmentDto[]>()

  for (const appointment of appointments) {
    const status = appointment.status as AppointmentStatus
    const dayKey = getDayKeyInSP(new Date(appointment.startDate))

    // IN_PROGRESS sempre vai para "Em Andamento" (qualquer data)
    if (status === 'IN_PROGRESS') {
      inProgress.push(appointment)
      continue
    }

    // COMPLETED / CANCELED / NO_SHOW sempre vai para "Anteriores"
    if (FINISHED_STATUSES.includes(status)) {
      finished.push(appointment)
      continue
    }

    // SCHEDULED com data passada → "Pendentes de Atualização"
    if (status === 'SCHEDULED' && dayKey < todayKey) {
      pending.push(appointment)
      continue
    }

    // SCHEDULED com data hoje ou futura → agrupado por dia
    const existing = scheduledByDay.get(dayKey) ?? []
    existing.push(appointment)
    scheduledByDay.set(dayKey, existing)
  }

  const result: DayGroup[] = []

  // 1. Pendentes de Atualização
  if (pending.length > 0) {
    result.push({
      label: 'Pendentes de Atualização',
      key: 'pending',
      appointments: sortByStartDate(pending),
      type: 'pending',
    })
  }

  // 2. Em Andamento
  if (inProgress.length > 0) {
    result.push({
      label: 'Em Andamento',
      key: 'in-progress',
      appointments: sortByStartDate(inProgress),
      type: 'in-progress',
    })
  }

  // 3 + 4. Hoje e Próximos (agrupados por dia, ordenados cronologicamente)
  const sortedDayKeys = Array.from(scheduledByDay.keys()).sort()
  for (const dayKey of sortedDayKeys) {
    const dayAppointments = scheduledByDay.get(dayKey)!
    const isToday = dayKey === todayKey
    result.push({
      label: getDayGroupLabel(dayKey),
      key: dayKey,
      appointments: sortByStartDate(dayAppointments),
      type: isToday ? 'today' : 'upcoming',
    })
  }

  // 5. Anteriores (COMPLETED / CANCELED / NO_SHOW)
  if (finished.length > 0) {
    result.push({
      label: 'Anteriores',
      key: 'past',
      appointments: sortByStartDate(finished),
      type: 'past',
    })
  }

  return result
}

const AppointmentsDataTable = ({
  appointments,
  dealOptions,
  members,
}: AppointmentsDataTableProps) => {
  // Estado do Sheet de edição (elevado para sobreviver ao re-render)
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado do dialog de deleção individual
  const [deletingAppointment, setDeletingAppointment] =
    useState<AppointmentDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, AppointmentStatus>
  >({})

  // Controle de grupos colapsados (somente "Anteriores" começa colapsado)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(['past']),
  )

  // Hook para atualizar agendamento (edição completa via Sheet)
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

  // Hook para atualizar apenas o status (via popover inline)
  const { execute: executeUpdateStatus } = useAction(updateAppointment, {
    onSuccess: () => {
      toast.success('Status atualizado com sucesso.')
    },
    onError: ({ error, input }) => {
      // Rollback optimistic update
      setStatusOverrides((prev) => {
        const next = { ...prev }
        delete next[input.id]
        return next
      })
      toast.error(error.serverError || 'Erro ao atualizar status.')
    },
  })

  const handleStatusSelect = useCallback(
    (appointmentId: string, newStatus: AppointmentStatus) => {
      setStatusOverrides((prev) => ({ ...prev, [appointmentId]: newStatus }))
      executeUpdateStatus({ id: appointmentId, status: newStatus })
    },
    [executeUpdateStatus],
  )

  // Hook para deletar agendamento
  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteAppointment,
    {
      onSuccess: () => {
        toast.success('Agendamento excluído com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingAppointment(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir agendamento.')
      },
    },
  )

  const handleEdit = useCallback((appointment: AppointmentDto) => {
    setEditingAppointment(appointment)
    setIsEditSheetOpen(true)
  }, [])

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])

  // Agrupamento memoizado por seção (considera status + data + timezone SP)
  const dayGroups = useMemo(
    () => groupAppointmentsBySection(appointments),
    [appointments],
  )

  return (
    <>
      {/* Sheet de edição fora da lista para sobreviver ao re-render */}
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

      {/* Dialog de deleção individual */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingAppointment(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente o agendamento{' '}
            <span className="font-bold text-foreground">
              {deletingAppointment?.title}
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingAppointment)
            executeDelete({ id: deletingAppointment.id })
        }}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Lista de grupos por dia */}
      <div className="flex flex-col gap-6">
        {dayGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <CalendarIcon className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhum agendamento encontrado.</p>
          </div>
        )}

        {dayGroups.map((group) => {
          const isCollapsible = group.type === 'past'
          const isCollapsed = collapsedGroups.has(group.key)
          const isPending = group.type === 'pending'
          const isDimmedGroup = group.type === 'past'
          // Seções com dias misturados precisam mostrar a data na coluna esquerda
          const showDate = group.type === 'pending' || group.type === 'in-progress' || group.type === 'past'

          return (
            <div key={group.key} className="flex flex-col gap-3">
              {/* Separador da seção */}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider',
                    isPending
                      ? 'text-kronos-yellow'
                      : 'text-muted-foreground',
                  )}
                >
                  {isPending && (
                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                  )}
                  {group.label}
                  <span className="font-normal normal-case">
                    ({group.appointments.length})
                  </span>
                </span>
                <div className="h-px flex-1 bg-border" />
                {isCollapsible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-xs text-muted-foreground"
                    onClick={() => toggleGroupCollapse(group.key)}
                  >
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 transition-transform duration-200',
                        isCollapsed ? '' : 'rotate-180',
                      )}
                    />
                    {isCollapsed ? 'Expandir' : 'Recolher'}
                  </Button>
                )}
              </div>

              {/* Items da timeline */}
              {!isCollapsed && (
                <div className="flex flex-col">
                  {group.appointments.map((appointment) => (
                    <TimelineItem
                      key={appointment.id}
                      appointment={appointment}
                      statusOverrides={statusOverrides}
                      onStatusSelect={handleStatusSelect}
                      onEdit={handleEdit}
                      onDeleteRequest={(appt) => {
                        setDeletingAppointment(appt)
                        setIsDeleteDialogOpen(true)
                      }}
                      isDimmed={isDimmedGroup}
                      showDate={showDate}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

export default AppointmentsDataTable

// ---------------------------------------------------------------------------
// Sub-componente: TimelineItem
// ---------------------------------------------------------------------------

// Configuração dos 3 botões de resolução rápida
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
    color: 'text-muted-foreground/50 hover:text-kronos-green hover:bg-kronos-green/10',
    activeColor: 'text-kronos-green bg-kronos-green/15',
  },
  {
    status: 'CANCELED',
    icon: BanIcon,
    label: 'Cancelado',
    color: 'text-muted-foreground/50 hover:text-kronos-red hover:bg-kronos-red/10',
    activeColor: 'text-kronos-red bg-kronos-red/15',
  },
  {
    status: 'NO_SHOW',
    icon: UserXIcon,
    label: 'Não Compareceu',
    color: 'text-muted-foreground/50 hover:text-kronos-yellow hover:bg-kronos-yellow/10',
    activeColor: 'text-kronos-yellow bg-kronos-yellow/15',
  },
]

interface TimelineItemProps {
  appointment: AppointmentDto
  statusOverrides: Record<string, AppointmentStatus>
  onStatusSelect: (appointmentId: string, newStatus: AppointmentStatus) => void
  onEdit: (appointment: AppointmentDto) => void
  onDeleteRequest: (appointment: AppointmentDto) => void
  isDimmed: boolean
  showDate: boolean
}

function TimelineItem({
  appointment,
  statusOverrides,
  onStatusSelect,
  onEdit,
  onDeleteRequest,
  isDimmed: isDimmedProp,
  showDate,
}: TimelineItemProps) {
  const currentStatus = (statusOverrides[appointment.id] ??
    appointment.status) as AppointmentStatus

  const isCanceled = currentStatus === 'CANCELED'
  const isNoShow = currentStatus === 'NO_SHOW'
  const isDimmed = isCanceled || isNoShow || isDimmedProp

  const startDate = new Date(appointment.startDate)
  const startTime = formatInTimeZone(startDate, SAO_PAULO_TZ, 'HH:mm')
  const startDay = showDate
    ? formatInTimeZone(startDate, SAO_PAULO_TZ, 'dd/MM')
    : null

  const duration = formatDuration(appointment.startDate, appointment.endDate)

  const handleCardClick = () => {
    onEdit(appointment)
  }

  return (
    <div className="flex gap-4">
      {/* Coluna esquerda: data/horário + linha vertical da timeline */}
      <div className="flex w-14 shrink-0 flex-col items-center">
        {startDay && (
          <span className="text-[10px] tabular-nums text-muted-foreground/70">
            {startDay}
          </span>
        )}
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {startTime}
        </span>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>

      {/* Card do appointment */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') handleCardClick()
        }}
        className={cn(
          'group mb-3 flex-1 rounded-lg border bg-card p-3 transition-all hover:border-primary/20 hover:shadow-md cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isDimmed && 'opacity-60',
        )}
      >
        {/* Linha 1: Título + duração */}
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              'text-sm font-semibold leading-tight',
              isCanceled && 'line-through',
            )}
          >
            {appointment.title}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <TimerIcon className="h-3 w-3" />
            {duration}
          </span>
        </div>

        {/* Linha 2: Deal + responsável (esquerda) | status + dropdown (direita) */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Metadados: deal e responsável — cliques não propagam para o card */}
          <div
            className="flex items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Chip do deal */}
            <Link
              href={`/crm/deals/${appointment.dealId}`}
              className="flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary hover:underline"
            >
              <LinkIcon className="h-3 w-3" />
              {appointment.dealTitle}
            </Link>

            {/* Responsável */}
            {appointment.assigneeName && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <UserIcon className="h-3 w-3" />
                {appointment.assigneeName}
              </span>
            )}
          </div>

          {/* Controles: ícones de resolução + dropdown */}
          <div
            className="flex items-center gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            {/* 3 ícones de resolução rápida */}
            {RESOLUTION_ACTIONS.map((action) => {
              const Icon = action.icon
              const isActive = currentStatus === action.status

              return (
                <Tooltip key={action.status}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                        isActive ? action.activeColor : action.color,
                      )}
                      onClick={() =>
                        onStatusSelect(
                          appointment.id,
                          isActive ? 'SCHEDULED' : action.status,
                        )
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isActive ? 'Voltar para Agendado' : action.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {/* Dropdown de ações */}
            <AppointmentTableDropdownMenu
              status={currentStatus}
              onEdit={() => onEdit(appointment)}
              onDelete={() => onDeleteRequest(appointment)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
