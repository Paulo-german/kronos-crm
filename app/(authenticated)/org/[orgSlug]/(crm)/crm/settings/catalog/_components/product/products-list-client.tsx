'use client'

import { useState, useCallback, useRef } from 'react'
import { TrashIcon } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Checkbox } from '@/_components/ui/checkbox'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import ConfirmationDialog from '@/_components/confirmation-dialog'

import { deleteProduct } from '@/_actions/product/delete-product'
import { updateProduct } from '@/_actions/product/update-product'
import { bulkDeleteProducts } from '@/_actions/product/bulk-delete-products'
import type { UpdateProductInput } from '@/_actions/product/update-product/schema'
import type { ProductDto } from '@/_data-access/product/get-products'

import UpsertProductDialogContent from './upsert-dialog-content'
import { ProductCardRow } from './product-card-row'
import { ProductsToolbar } from './products-toolbar'
import { ProductsPagination } from './products-pagination'

// ---------------------------------------------------------------------------
// ProductsCardList — lista interna com select-all e bulk delete
// ---------------------------------------------------------------------------

interface ProductsCardListProps {
  products: ProductDto[]
  onEdit: (product: ProductDto) => void
  onDelete: (product: ProductDto) => void
  onBulkDelete: (ids: string[], resetSelection: () => void) => void
}

function ProductsCardList({
  products,
  onEdit,
  onDelete,
  onBulkDelete,
}: ProductsCardListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isAllSelected =
    products.length > 0 && products.every((product) => selectedIds.has(product.id))

  const isIndeterminate =
    !isAllSelected && products.some((product) => selectedIds.has(product.id))

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(products.map((product) => product.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [products],
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

  if (products.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          Nenhum produto encontrado.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 rounded-lg px-4 py-2">
        <Checkbox
          checked={isIndeterminate ? 'indeterminate' : isAllSelected}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
          aria-label="Selecionar todos os produtos"
        />
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'produto selecionado' : 'produtos selecionados'}
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleBulkDelete}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Remover selecionados
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {products.length}{' '}
            {products.length === 1 ? 'produto' : 'produtos'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {products.map((product) => (
          <ProductCardRow
            key={product.id}
            product={product}
            isSelected={selectedIds.has(product.id)}
            onSelectionChange={(checked) =>
              handleSelectionChange(product.id, checked)
            }
            onEdit={() => onEdit(product)}
            onDelete={() => onDelete(product)}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProductsListClient — orquestrador principal
// ---------------------------------------------------------------------------

interface ProductsListClientProps {
  products: ProductDto[]
  withinQuota: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function ProductsListClient({
  products,
  withinQuota,
  page,
  pageSize,
  total,
  totalPages,
}: ProductsListClientProps) {
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  const { execute: executeDelete, isPending: isDeletingIndividual } = useAction(
    deleteProduct,
    {
      onSuccess: () => {
        toast.success('Produto removido com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingProduct(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover produto.')
      },
    },
  )

  const { execute: executeBulkDelete, isPending: isBulkDeleting } = useAction(
    bulkDeleteProducts,
    {
      onSuccess: () => {
        toast.success('Produtos removidos com sucesso.')
        setIsBulkDeleteOpen(false)
        resetSelectionRef.current?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover produtos.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateProduct,
    {
      onSuccess: () => {
        toast.success('Produto atualizado com sucesso!')
        setIsEditSheetOpen(false)
        setEditingProduct(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar produto.')
      },
    },
  )

  const handleEdit = (product: ProductDto) => {
    setEditingProduct(product)
    setIsEditSheetOpen(true)
  }

  const toFormValues = (product: ProductDto) => ({
    id: product.id,
    name: product.name,
    description: product.description ?? undefined,
    price: product.price,
    isActive: product.isActive,
  })

  const handleDelete = (product: ProductDto) => {
    setDeletingProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdate = (data: UpdateProductInput) => {
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
        <ProductsToolbar withinQuota={withinQuota} />

        <ProductsCardList
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
        />

        <ProductsPagination
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
          if (!open) setEditingProduct(null)
        }}
      >
        {editingProduct && (
          <UpsertProductDialogContent
            key={editingProduct.id}
            defaultValues={toFormValues(editingProduct)}
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
          if (!open) setDeletingProduct(null)
        }}
        title="Remover produto?"
        description={
          <p>
            Esta ação irá remover o produto{' '}
            <span className="font-bold text-foreground">
              {deletingProduct?.name}
            </span>{' '}
            permanentemente.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingProduct) {
            executeDelete({ id: deletingProduct.id })
          }
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Remover Produto"
      />

      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Remover produtos selecionados?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} produto(s) permanentemente.
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          executeBulkDelete({ ids: bulkDeleteIds })
        }}
        isLoading={isBulkDeleting}
        confirmLabel="Remover Selecionados"
      />
    </>
  )
}
