'use client'

import { useState, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  LayersIcon,
  ClockIcon,
  DollarSignIcon,
  PowerIcon,
  TrashIcon,
  PencilIcon,
  MoreHorizontalIcon,
  TagIcon,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { DataTable } from '@/_components/data-table'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { formatCurrency } from '@/_utils/format-currency'

import { deleteService } from '@/_actions/service/delete-service'
import { updateService } from '@/_actions/service/update-service'
import type { UpdateServiceInput } from '@/_actions/service/update-service/schema'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'

import UpsertServiceDialogContent from './upsert-service-dialog-content'

// Formata duração em minutos para exibição legível
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) return `${remainingMinutes} min`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}

interface ServicesDataTableProps {
  services: ServiceDto[]
  categories: ServiceCategoryDto[]
}

export function ServicesDataTable({
  services,
  categories,
}: ServicesDataTableProps) {
  // Estado do sheet de edição elevado para sobreviver ao re-render da tabela
  const [editingService, setEditingService] = useState<ServiceDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  // Estado do dialog de deleção individual
  const [deletingService, setDeletingService] = useState<ServiceDto | null>(
    null,
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Estado de deleção em massa
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  const { execute: executeDelete, isPending: isDeletingIndividual } =
    useAction(deleteService, {
      onSuccess: () => {
        toast.success('Serviço removido com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingService(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover serviço.')
      },
    })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateService,
    {
      onSuccess: () => {
        toast.success('Serviço atualizado com sucesso!')
        setIsEditSheetOpen(false)
        setEditingService(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar serviço.')
      },
    },
  )

  const handleEdit = (service: ServiceDto) => {
    setEditingService(service)
    setIsEditSheetOpen(true)
  }

  const handleDelete = (service: ServiceDto) => {
    setDeletingService(service)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdate = (data: UpdateServiceInput) => {
    executeUpdate(data)
  }

  const columns: ColumnDef<ServiceDto>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <LayersIcon className="h-4 w-4 text-muted-foreground" />
          <span>Serviço</span>
        </div>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('name')}</span>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: () => (
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-muted-foreground" />
          <span>Categoria</span>
        </div>
      ),
      cell: ({ row }) => {
        const categoryName = row.getValue('categoryName') as string
        return (
          <Badge variant="outline" className="text-xs">
            {categoryName}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'duration',
      header: () => (
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-muted-foreground" />
          <span>Duração</span>
        </div>
      ),
      cell: ({ row }) => {
        const duration = row.getValue('duration') as number
        return (
          <span className="text-sm">{formatDuration(duration)}</span>
        )
      },
    },
    {
      accessorKey: 'price',
      header: () => (
        <div className="flex items-center gap-2">
          <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          <span>Preço</span>
        </div>
      ),
      cell: ({ row }) => {
        const price = row.getValue('price') as string
        return (
          <span className="text-sm font-medium">
            {formatCurrency(parseFloat(price))}
          </span>
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
      id: 'actions',
      cell: ({ row }) => {
        const service = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(service)}>
                <PencilIcon className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(service)}
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
          if (!open) setEditingService(null)
        }}
      >
        {editingService && (
          <UpsertServiceDialogContent
            key={editingService.id}
            categories={categories}
            defaultValues={editingService}
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
          if (!open) setDeletingService(null)
        }}
        title="Remover serviço?"
        description={
          <p>
            Esta ação irá remover o serviço{' '}
            <span className="font-bold text-foreground">
              {deletingService?.name}
            </span>{' '}
            permanentemente.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingService) {
            executeDelete({ id: deletingService.id })
          }
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Remover Serviço"
      />

      {/* Dialog de deleção em massa */}
      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Remover serviços selecionados?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} serviço(s) permanentemente.
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
        data={services}
        enableSelection
        bulkActions={({ selectedRows, resetSelection }) => {
          resetSelectionRef.current = resetSelection
          return (
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => {
                setBulkDeleteIds(selectedRows.map((service) => service.id))
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
