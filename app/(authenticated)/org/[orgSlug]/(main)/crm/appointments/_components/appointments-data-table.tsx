'use client'

import { useState, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  CalendarIcon,
  ChevronDown,
  ClockIcon,
  LinkIcon,
  CircleDotIcon,
  TypeIcon,
  UserIcon,
  TimerIcon,
  TrashIcon,
} from 'lucide-react'
import Link from 'next/link'
import { CircleIcon } from 'lucide-react'
import { DataTable } from '@/_components/data-table'
import { Sheet } from '@/_components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { differenceInMinutes } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

const SAO_PAULO_TZ = 'America/Sao_Paulo'
import { updateAppointment } from '@/_actions/appointment/update-appointment'
import { deleteAppointment } from '@/_actions/appointment/delete-appointment'
import { UpsertAppointmentDialogContent } from './upsert-dialog-content'
import AppointmentTableDropdownMenu from './table-dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AppointmentStatus } from '@prisma/client'

interface MemberDto {
  id: string
  userId: string | null
  email: string
  user: {
    fullName: string | null
    avatarUrl: string | null
  } | null
}

interface AppointmentsDataTableProps {
  appointments: AppointmentDto[]
  dealOptions: DealOptionDto[]
  members: MemberDto[]
}

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string }
> = {
  SCHEDULED: {
    label: 'AGENDADO',
    color: 'text-kronos-blue',
  },
  IN_PROGRESS: {
    label: 'EM ANDAMENTO',
    color: 'text-kronos-purple',
  },
  COMPLETED: {
    label: 'CONCLUÍDO',
    color: 'text-kronos-green',
  },
  CANCELED: {
    label: 'CANCELADO',
    color: 'text-kronos-red',
  },
  NO_SHOW: {
    label: 'NÃO COMPARECEU',
    color: 'text-kronos-yellow',
  },
}

const formatDuration = (startDate: Date, endDate: Date): string => {
  const minutes = differenceInMinutes(new Date(endDate), new Date(startDate))
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}

const AppointmentsDataTable = ({
  appointments,
  dealOptions,
  members,
}: AppointmentsDataTableProps) => {
  // Estado do Sheet de edição (elevado para sobreviver ao re-render da tabela)
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado do dialog de deleção individual
  const [deletingAppointment, setDeletingAppointment] =
    useState<AppointmentDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Status popover controlado (apenas 1 aberto por vez)
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, AppointmentStatus>
  >({})

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
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar status.')
    },
  })

  const handleStatusSelect = useCallback(
    (appointmentId: string, newStatus: AppointmentStatus) => {
      // Optimistic update
      setStatusOverrides((prev) => ({ ...prev, [appointmentId]: newStatus }))
      setOpenStatusId(null)

      executeUpdateStatus({ id: appointmentId, status: newStatus })
    },
    [executeUpdateStatus],
  )

  // Hook para deletar agendamento
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

  const handleEdit = (appointment: AppointmentDto) => {
    setEditingAppointment(appointment)
    setIsEditSheetOpen(true)
  }

  const columns: ColumnDef<AppointmentDto>[] = [
    {
      accessorKey: 'title',
      header: () => (
        <div className="flex items-center gap-2">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
          <span>Título</span>
        </div>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'dealTitle',
      header: () => (
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          <span>Negócio</span>
        </div>
      ),
      cell: ({ row }) => {
        const { dealId, dealTitle } = row.original
        if (!dealId)
          return <span className="text-xs text-muted-foreground">-</span>

        return (
          <Link
            href={`/crm/deals/${dealId}`}
            className="flex w-fit items-center gap-1.5 rounded-md bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary hover:underline"
          >
            <LinkIcon className="h-3 w-3" />
            {dealTitle}
          </Link>
        )
      },
    },
    {
      accessorKey: 'status',
      header: () => (
        <div className="flex items-center gap-2">
          <CircleDotIcon className="h-4 w-4 text-muted-foreground" />
          <span>Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const appointment = row.original
        const status = (statusOverrides[appointment.id] ?? appointment.status) as AppointmentStatus
        const config = STATUS_CONFIG[status]
        const isOpen = openStatusId === appointment.id

        return (
          <Popover
            open={isOpen}
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
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[10px] font-semibold transition-colors hover:bg-accent ${cfg.color} ${
                    status === key ? 'bg-accent' : ''
                  }`}
                  onClick={() =>
                    handleStatusSelect(appointment.id, key as AppointmentStatus)
                  }
                >
                  {cfg.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )
      },
    },
    {
      accessorKey: 'assigneeName',
      header: () => (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span>Responsável</span>
        </div>
      ),
      cell: ({ row }) => {
        const name = row.original.assigneeName
        if (!name)
          return <span className="text-xs text-muted-foreground">-</span>
        return <span className="text-sm">{name}</span>
      },
    },
    {
      id: 'period',
      header: () => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>Período</span>
        </div>
      ),
      cell: ({ row }) => {
        const { startDate, endDate } = row.original
        if (!startDate || !endDate)
          return <span className="text-muted-foreground">—</span>

        const start = formatInTimeZone(new Date(startDate), SAO_PAULO_TZ, "dd/MM/yyyy 'às' HH:mm", {
          locale: ptBR,
        })
        const end = formatInTimeZone(new Date(endDate), SAO_PAULO_TZ, "dd/MM/yyyy 'às' HH:mm", {
          locale: ptBR,
        })

        return (
          <div className="flex items-center gap-1.5 text-sm">
            <span>{start}</span>
            <span className="text-muted-foreground">•</span>
            <span>{end}</span>
          </div>
        )
      },
    },
    {
      id: 'duration',
      header: () => (
        <div className="flex items-center gap-2">
          <TimerIcon className="h-4 w-4 text-muted-foreground" />
          <span>Duração</span>
        </div>
      ),
      cell: ({ row }) => {
        const { startDate, endDate } = row.original
        if (!startDate || !endDate)
          return <span className="text-muted-foreground">—</span>

        return (
          <span className="text-sm">
            {formatDuration(startDate, endDate)}
          </span>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => (
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-muted-foreground" />
          <span>Criado em</span>
        </div>
      ),
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date | null
        if (!date)
          return <span className="text-muted-foreground">—</span>

        return (
          <span className="text-sm text-muted-foreground">
            {formatInTimeZone(new Date(date), SAO_PAULO_TZ, 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const appointment = row.original
        return (
          <AppointmentTableDropdownMenu
            status={appointment.status}
            onEdit={() => handleEdit(appointment)}
            onDelete={() => {
              setDeletingAppointment(appointment)
              setIsDeleteDialogOpen(true)
            }}
          />
        )
      },
    },
  ]

  return (
    <>
      {/* Sheet de edição fora da tabela para sobreviver ao re-render */}
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

      <DataTable columns={columns} data={appointments} />
    </>
  )
}

export default AppointmentsDataTable
