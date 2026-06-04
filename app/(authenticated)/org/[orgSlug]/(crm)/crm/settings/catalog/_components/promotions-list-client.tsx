'use client'

import { useState, useCallback, useRef } from 'react'
import { TrashIcon } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import { Sheet } from '@/_components/ui/sheet'
import ConfirmationDialog from '@/_components/confirmation-dialog'

import { deletePromotion } from '@/_actions/promotion/delete-promotion'
import { updatePromotion } from '@/_actions/promotion/update-promotion'
import type { UpdatePromotionInput } from '@/_actions/promotion/update-promotion/schema'
import type { PromotionDto } from '@/_data-access/promotion/get-promotions'
import type { ProductDto } from '@/_data-access/product/get-products'
import type { ServiceDto } from '@/_data-access/service/get-services'

import { PromotionCardRow } from './promotion-card-row'
import { PromotionsToolbar } from './promotions-toolbar'
import { PromotionsPagination } from './promotions-pagination'
import { UpsertPromotionSheet } from './upsert-promotion-sheet'

// ---------------------------------------------------------------------------
// PromotionsCardList (componente privado)
// ---------------------------------------------------------------------------

interface PromotionsCardListProps {
  promotions: PromotionDto[]
  onEdit: (promotion: PromotionDto) => void
  onDelete: (promotion: PromotionDto) => void
  onBulkDelete: (ids: string[], resetSelection: () => void) => void
}

function PromotionsCardList({
  promotions,
  onEdit,
  onDelete,
  onBulkDelete,
}: PromotionsCardListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isAllSelected =
    promotions.length > 0 && promotions.every((promotion) => selectedIds.has(promotion.id))

  const isIndeterminate =
    !isAllSelected && promotions.some((promotion) => selectedIds.has(promotion.id))

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(promotions.map((promotion) => promotion.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [promotions],
  )

  const handleSelectionChange = useCallback((id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const resetSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkDelete = () => {
    onBulkDelete(Array.from(selectedIds), resetSelection)
  }

  if (promotions.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Nenhuma promoção encontrada.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 rounded-lg px-4 py-2">
        <Checkbox
          checked={isIndeterminate ? 'indeterminate' : isAllSelected}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
          aria-label="Selecionar todas as promoções"
        />
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'promoção selecionada' : 'promoções selecionadas'}
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleBulkDelete}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Remover selecionadas
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {promotions.length}{' '}
            {promotions.length === 1 ? 'promoção' : 'promoções'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {promotions.map((promotion) => (
          <PromotionCardRow
            key={promotion.id}
            promotion={promotion}
            isSelected={selectedIds.has(promotion.id)}
            onSelectionChange={(checked) => handleSelectionChange(promotion.id, checked)}
            onEdit={() => onEdit(promotion)}
            onDelete={() => onDelete(promotion)}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PromotionsListClient (orquestrador principal)
// ---------------------------------------------------------------------------

interface PromotionsListClientProps {
  promotions: PromotionDto[]
  products: ProductDto[]
  services: ServiceDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function PromotionsListClient({
  promotions,
  products,
  services,
  page,
  pageSize,
  total,
  totalPages,
}: PromotionsListClientProps) {
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)

  const [editingPromotion, setEditingPromotion] = useState<PromotionDto | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const [deletingPromotion, setDeletingPromotion] = useState<PromotionDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  const { execute: executeDelete, isPending: isDeleting } = useAction(deletePromotion, {
    onSuccess: () => {
      toast.success('Promoção removida com sucesso.')
      setIsDeleteDialogOpen(false)
      setDeletingPromotion(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao remover promoção.')
    },
  })

  const { execute: executeUpdate, isPending: isUpdating } = useAction(updatePromotion, {
    onSuccess: () => {
      toast.success('Promoção atualizada com sucesso!')
      setIsSheetOpen(false)
      setEditingPromotion(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar promoção.')
    },
  })

  const handleEdit = (promotion: PromotionDto) => {
    setEditingPromotion(promotion)
    setIsSheetOpen(true)
  }

  const handleDelete = (promotion: PromotionDto) => {
    setDeletingPromotion(promotion)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdate = (data: UpdatePromotionInput) => {
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
        <PromotionsToolbar onNew={() => setIsCreateSheetOpen(true)} />

        <PromotionsCardList
          promotions={promotions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
        />

        <PromotionsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
        />
      </div>

      <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
        <UpsertPromotionSheet
          open={isCreateSheetOpen}
          onOpenChange={setIsCreateSheetOpen}
          onUpdate={handleUpdate}
          isUpdating={false}
          products={products}
          services={services}
        />
      </Sheet>

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open)
          if (!open) setEditingPromotion(null)
        }}
      >
        {editingPromotion && (
          <UpsertPromotionSheet
            key={editingPromotion.id}
            open={isSheetOpen}
            onOpenChange={(open) => {
              setIsSheetOpen(open)
              if (!open) setEditingPromotion(null)
            }}
            defaultValues={editingPromotion}
            onUpdate={handleUpdate}
            isUpdating={isUpdating}
            products={products}
            services={services}
          />
        )}
      </Sheet>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingPromotion(null)
        }}
        title="Remover promoção?"
        description={
          <p>
            Esta ação irá remover a promoção{' '}
            <span className="font-bold text-foreground">{deletingPromotion?.name}</span>{' '}
            permanentemente.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingPromotion) {
            executeDelete({ id: deletingPromotion.id })
          }
        }}
        isLoading={isDeleting}
        confirmLabel="Remover Promoção"
      />

      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Remover promoções selecionadas?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} promoção(ões) permanentemente.
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
        isLoading={isDeleting}
        confirmLabel="Remover Selecionadas"
      />
    </>
  )
}
