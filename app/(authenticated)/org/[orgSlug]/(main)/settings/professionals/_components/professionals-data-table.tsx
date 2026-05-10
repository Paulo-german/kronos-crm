'use client'

import { useState, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  UserIcon,
  PhoneIcon,
  PowerIcon,
  CalendarIcon,
  MoreHorizontalIcon,
  TrashIcon,
  PencilIcon,
  LinkIcon,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { DataTable } from '@/_components/data-table'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'

import { deleteProfessional } from '@/_actions/professional/delete-professional'
import { updateProfessional } from '@/_actions/professional/update-professional'
import type { UpdateProfessionalInput } from '@/_actions/professional/update-professional/schema'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'

import UpsertProfessionalDialogContent from './upsert-professional-dialog-content'

// Gera iniciais do nome para o avatar fallback
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

interface ProfessionalsDataTableProps {
  professionals: ProfessionalDto[]
}

export function ProfessionalsDataTable({
  professionals,
}: ProfessionalsDataTableProps) {
  // Estado do dialog de edição elevado para sobreviver ao re-render da tabela
  const [editingProfessional, setEditingProfessional] =
    useState<ProfessionalDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado do dialog de deleção individual
  const [deletingProfessional, setDeletingProfessional] =
    useState<ProfessionalDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Estado de deleção em massa
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  const { execute: executeDelete, isPending: isDeletingIndividual } =
    useAction(deleteProfessional, {
      onSuccess: () => {
        toast.success('Profissional removido com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingProfessional(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover profissional.')
      },
    })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateProfessional,
    {
      onSuccess: () => {
        toast.success('Profissional atualizado com sucesso!')
        setIsEditSheetOpen(false)
        setEditingProfessional(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar profissional.')
      },
    },
  )

  const handleEdit = (professional: ProfessionalDto) => {
    setEditingProfessional(professional)
    setIsEditSheetOpen(true)
  }

  const handleDelete = (professional: ProfessionalDto) => {
    setDeletingProfessional(professional)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdate = (data: UpdateProfessionalInput) => {
    executeUpdate(data)
  }

  const columns: ColumnDef<ProfessionalDto>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span>Profissional</span>
        </div>
      ),
      cell: ({ row }) => {
        const professional = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={professional.avatarUrl ?? undefined} alt={professional.name} />
              <AvatarFallback className="text-xs font-medium">
                {getInitials(professional.name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{professional.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: () => (
        <div className="flex items-center gap-2">
          <PhoneIcon className="h-4 w-4 text-muted-foreground" />
          <span>Telefone</span>
        </div>
      ),
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null
        return phone ? (
          <span>{phone}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: () => (
        <div className="flex items-center gap-2">
          <PowerIcon className="h-4 w-4 text-muted-foreground" />
          <span>Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return isActive ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
            Ativo
          </Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
        )
      },
    },
    {
      accessorKey: 'userId',
      header: () => (
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          <span>Usuário</span>
        </div>
      ),
      cell: ({ row }) => {
        const userId = row.getValue('userId') as string | null
        return userId ? (
          <Badge variant="outline" className="text-xs">
            Vinculado
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>Criado em</span>
        </div>
      ),
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date
        return (
          <span className="text-muted-foreground text-sm">
            {format(date, 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const professional = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(professional)}>
                <PencilIcon className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(professional)}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          if (!open) setEditingProfessional(null)
        }}
      >
        {editingProfessional && (
          <UpsertProfessionalDialogContent
            key={editingProfessional.id}
            defaultValues={editingProfessional}
            setIsOpen={setIsEditSheetOpen}
            isOpen={isEditSheetOpen}
            onUpdate={handleUpdate}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      {/* Dialog de deleção individual */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingProfessional(null)
        }}
        title="Remover profissional?"
        description={
          <p>
            Esta ação irá remover o profissional{' '}
            <span className="font-bold text-foreground">
              {deletingProfessional?.name}
            </span>{' '}
            permanentemente. Agendamentos futuros vinculados a ele serão
            desvinculados.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingProfessional) {
            executeDelete({ id: deletingProfessional.id })
          }
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Remover Profissional"
      />

      {/* Dialog de deleção em massa */}
      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Remover profissionais selecionados?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} profissional(is) permanentemente.
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          bulkDeleteIds.forEach((id) => executeDelete({ id }))
          setIsBulkDeleteOpen(false)
          resetSelectionRef.current?.()
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Remover Selecionados"
      />

      <DataTable
        columns={columns}
        data={professionals}
        enableSelection
        bulkActions={({ selectedRows, resetSelection }) => {
          resetSelectionRef.current = resetSelection
          return (
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => {
                setBulkDeleteIds(selectedRows.map((professional) => professional.id))
                setIsBulkDeleteOpen(true)
              }}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Remover
            </Button>
          )
        }}
      />
    </>
  )
}
