'use client'

import { useState, useRef } from 'react'
import { TrashIcon } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Sheet } from '@/_components/ui/sheet'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { deleteService } from '@/_actions/service/delete-service'
import { updateService } from '@/_actions/service/update-service'
import type { UpdateServiceInput } from '@/_actions/service/update-service/schema'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'
import type { ProfessionalDto } from '@/_data-access/professional/get-professionals'

import UpsertServiceDialogContent from './upsert-service-dialog-content'
import { ServicesDataTable } from './services-data-table'
import { ServicesToolbar } from './services-toolbar'
import { ServicesPagination } from './services-pagination'

interface ServicesListClientProps {
  services: ServiceDto[]
  categories: ServiceCategoryDto[]
  professionals: ProfessionalDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function ServicesListClient({
  services,
  categories,
  professionals,
  page,
  pageSize,
  total,
  totalPages,
}: ServicesListClientProps) {
  const [editingService, setEditingService] = useState<ServiceDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  const [deletingService, setDeletingService] = useState<ServiceDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  const { execute: executeDelete, isPending: isDeletingIndividual } = useAction(
    deleteService,
    {
      onSuccess: () => {
        toast.success('Serviço removido com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingService(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover serviço.')
      },
    },
  )

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

  const handleBulkDelete = (ids: string[], resetSelection: () => void) => {
    resetSelectionRef.current = resetSelection
    setBulkDeleteIds(ids)
    setIsBulkDeleteOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <ServicesToolbar
          categories={categories}
          professionals={professionals}
        />

        <ServicesDataTable
          services={services}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
        />

        <ServicesPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
        />
      </div>

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
            professionals={professionals}
            defaultValues={editingService}
            setIsOpen={setIsEditSheetOpen}
            isOpen={isEditSheetOpen}
            onUpdate={handleUpdate}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

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
    </>
  )
}
