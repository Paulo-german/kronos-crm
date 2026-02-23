'use client'

import { useState, useCallback } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Plus,
  CircleIcon,
  ChevronDown,
  CalendarIcon,
  ClockIcon,
  CircleDotIcon,
  TypeIcon,
  UserIcon,
  TimerIcon,
  TrashIcon,
} from 'lucide-react'
import { differenceInMinutes } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import ConfirmationDialog from '@/_components/confirmation-dialog'

import { updateAppointment } from '@/_actions/appointment/update-appointment'
import { deleteAppointment } from '@/_actions/appointment/delete-appointment'
import { UpsertAppointmentDialogContent } from '../../../appointments/_components/upsert-dialog-content'
import AppointmentTableDropdownMenu from '../../../appointments/_components/table-dropdown-menu'

import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { DealAppointmentDto } from '@/_data-access/appointment/get-deal-appointments'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AppointmentStatus } from '@prisma/client'

const SAO_PAULO_TZ = 'America/Sao_Paulo'

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string }> = {
  SCHEDULED: { label: 'AGENDADO', color: 'text-kronos-blue' },
  IN_PROGRESS: { label: 'EM ANDAMENTO', color: 'text-kronos-purple' },
  COMPLETED: { label: 'CONCLUÍDO', color: 'text-kronos-green' },
  CANCELED: { label: 'CANCELADO', color: 'text-kronos-red' },
  NO_SHOW: { label: 'NÃO COMPARECEU', color: 'text-kronos-yellow' },
}

const formatDuration = (startDate: Date, endDate: Date): string => {
  const minutes = differenceInMinutes(new Date(endDate), new Date(startDate))
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}

interface MemberDto {
  id: string
  userId: string | null
  email: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
}

interface TabAppointmentsProps {
  deal: DealDetailsDto
  appointments: DealAppointmentDto[]
  members: MemberDto[]
  dealOptions: DealOptionDto[]
}

const TabAppointments = ({
  deal,
  appointments,
  members,
  dealOptions,
}: TabAppointmentsProps) => {
  const [editingAppointment, setEditingAppointment] =
    useState<DealAppointmentDto | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const [deletingAppointment, setDeletingAppointment] =
    useState<DealAppointmentDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [openStatusId, setOpenStatusId] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, AppointmentStatus>
  >({})

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateAppointment,
    {
      onSuccess: () => {
        toast.success('Agendamento atualizado com sucesso.')
        setIsSheetOpen(false)
        setEditingAppointment(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar agendamento.')
      },
    },
  )

  const { execute: executeUpdateStatus } = useAction(updateAppointment, {
    onSuccess: () => {
      toast.success('Status atualizado com sucesso.')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar status.')
    },
  })

  const handleStatusSelect = useCallback(
    (appointmentId: string, newStatus: AppointmentStatus) => {
      setStatusOverrides((prev) => ({ ...prev, [appointmentId]: newStatus }))
      setOpenStatusId(null)
      executeUpdateStatus({ id: appointmentId, status: newStatus })
    },
    [executeUpdateStatus],
  )

  const { execute: executeDelete, isExecuting: isDeleting } = useAction(
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

  const handleEdit = (appointment: DealAppointmentDto) => {
    setEditingAppointment(appointment)
    setIsSheetOpen(true)
  }

  // Mapeia DealAppointmentDto para o formato que o UpsertAppointmentDialogContent espera
  const mapToAppointmentDto = (appointment: DealAppointmentDto) => ({
    id: appointment.id,
    title: appointment.title,
    description: appointment.description,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
    status: appointment.status,
    assignedTo: appointment.assignedTo,
    assigneeName: appointment.assigneeName,
    dealId: appointment.dealId,
    dealTitle: appointment.dealTitle,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  })

  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Agendamentos</CardTitle>

        <Sheet
          open={isSheetOpen}
          onOpenChange={(open) => {
            setIsSheetOpen(open)
            if (!open) setEditingAppointment(null)
          }}
        >
          <Button size="sm" onClick={() => setIsSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>

          {editingAppointment ? (
            <UpsertAppointmentDialogContent
              key={editingAppointment.id}
              defaultValues={mapToAppointmentDto(editingAppointment)}
              dealOptions={dealOptions}
              members={members}
              setIsOpen={setIsSheetOpen}
              onUpdate={(data) => executeUpdate(data)}
              isUpdating={isUpdating}
              fixedDealId={deal.id}
            />
          ) : (
            <UpsertAppointmentDialogContent
              key="new"
              dealOptions={dealOptions}
              members={members}
              setIsOpen={setIsSheetOpen}
              fixedDealId={deal.id}
            />
          )}
        </Sheet>
      </CardHeader>

      <CardContent>
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground">
            <p>Nenhum agendamento vinculado a este negócio.</p>
            <Button size="sm" onClick={() => setIsSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border/50">
            <Table className="bg-secondary/20">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Título</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <CircleDotIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Status</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Responsável</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Período</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <TimerIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Duração</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Criado em</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card">
                {appointments.map((appointment) => {
                  const status =
                    (statusOverrides[appointment.id] ??
                      appointment.status) as AppointmentStatus
                  const config = STATUS_CONFIG[status]
                  const isStatusOpen = openStatusId === appointment.id

                  return (
                    <TableRow key={appointment.id}>
                      {/* Título */}
                      <TableCell className="font-medium">
                        {appointment.title}
                      </TableCell>

                      {/* Status com Popover inline */}
                      <TableCell>
                        <Popover
                          open={isStatusOpen}
                          onOpenChange={(open) =>
                            setOpenStatusId(open ? appointment.id : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={`flex items-center gap-1.5 rounded-md border bg-transparent px-2 py-0.5 text-[10px] font-semibold transition-colors hover:bg-accent ${config.color}`}
                            >
                              <CircleIcon className="h-1.5 w-1.5 fill-current" />
                              {config.label}
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            side="bottom"
                            className="w-auto min-w-[140px] p-1"
                          >
                            <p className="px-2 py-1.5 text-xs font-bold uppercase text-muted-foreground">
                              Status
                            </p>
                            {Object.entries(STATUS_CONFIG).map(
                              ([key, cfg]) => (
                                <button
                                  key={key}
                                  type="button"
                                  className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[10px] font-semibold transition-colors hover:bg-accent ${cfg.color} ${
                                    status === key ? 'bg-accent' : ''
                                  }`}
                                  onClick={() =>
                                    handleStatusSelect(
                                      appointment.id,
                                      key as AppointmentStatus,
                                    )
                                  }
                                >
                                  {cfg.label}
                                </button>
                              ),
                            )}
                          </PopoverContent>
                        </Popover>
                      </TableCell>

                      {/* Responsável */}
                      <TableCell>
                        {appointment.assigneeName ? (
                          <span className="text-sm">
                            {appointment.assigneeName}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>

                      {/* Período */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span>
                            {formatInTimeZone(
                              new Date(appointment.startDate),
                              SAO_PAULO_TZ,
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR },
                            )}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span>
                            {formatInTimeZone(
                              new Date(appointment.endDate),
                              SAO_PAULO_TZ,
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR },
                            )}
                          </span>
                        </div>
                      </TableCell>

                      {/* Duração */}
                      <TableCell>
                        <span className="text-sm">
                          {formatDuration(
                            appointment.startDate,
                            appointment.endDate,
                          )}
                        </span>
                      </TableCell>

                      {/* Criado em */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatInTimeZone(
                            new Date(appointment.createdAt),
                            SAO_PAULO_TZ,
                            'dd/MM/yyyy',
                            { locale: ptBR },
                          )}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <AppointmentTableDropdownMenu
                          status={appointment.status}
                          onEdit={() => handleEdit(appointment)}
                          onDelete={() => {
                            setDeletingAppointment(appointment)
                            setIsDeleteDialogOpen(true)
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

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
    </Card>
  )
}

export default TabAppointments
