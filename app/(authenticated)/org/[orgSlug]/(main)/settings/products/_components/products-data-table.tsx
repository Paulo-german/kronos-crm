'use client'

import { useState, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  DollarSignIcon,
  ImageIcon,
  PackageIcon,
  PowerIcon,
  TextIcon,
  TrashIcon,
} from 'lucide-react'
import { DataTable } from '@/_components/data-table'
import type { ProductDto } from '@/_data-access/product/get-products'
import { formatCurrency } from '@/_utils/format-currency'
import ProductTableDropdownMenu from './table-dropdown-menu'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import { useAction } from 'next-safe-action/hooks'
import { bulkDeleteProducts } from '@/_actions/product/bulk-delete-products'
import { deleteProduct } from '@/_actions/product/delete-product'
import { updateProduct } from '@/_actions/product/update-product'
import { toast } from 'sonner'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertProductDialogContent from './upsert-dialog-content'
import { ProductMediaDialog } from './product-media-dialog'

interface ProductsDataTableProps {
  products: ProductDto[]
}

export function ProductsDataTable({ products }: ProductsDataTableProps) {
  // Estado do dialog de edição (levantado para cá para sobreviver ao re-render da tabela)
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  // Estado do dialog de deleção individual
  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(
    null,
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  // Estado do dialog de deleção em massa
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  // Estado do dialog de gerenciamento de mídias
  const [mediaProduct, setMediaProduct] = useState<ProductDto | null>(null)
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false)

  // Hook para deletar em massa
  const { execute: executeBulkDelete, isExecuting: isDeleting } = useAction(
    bulkDeleteProducts,
    {
      onSuccess: ({ data }) => {
        toast.success(`${data?.count || 'Produtos'} excluídos com sucesso.`)
        setIsBulkDeleteOpen(false)
        resetSelectionRef.current?.()
      },
      onError: () => {
        toast.error('Erro ao excluir produtos.')
      },
    },
  )

  // Hook para deletar individualmente (precisa estar aqui para não desmontar com a linha da tabela)
  const { execute: executeDelete, isExecuting: isDeletingIndividual } =
    useAction(deleteProduct, {
      onSuccess: () => {
        toast.success('Produto excluído com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingProduct(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir produto.')
      },
    })

  // Hook para atualizar individualmente (precisa estar aqui para não desmontar com a linha da tabela)
  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateProduct,
    {
      onSuccess: () => {
        toast.success('Produto atualizado com sucesso!')
        setIsEditDialogOpen(false)
        setEditingProduct(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar produto.')
      },
    },
  )

  // Hook para toggle de isActive (separado para não bloquear o form de edição)
  const { execute: executeToggleActive, isPending: isTogglingActive } =
    useAction(updateProduct, {
      onSuccess: ({ input }) => {
        toast.success(
          input.isActive
            ? 'Produto ativado com sucesso.'
            : 'Produto desativado.',
        )
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao alterar status do produto.')
      },
    })

  const handleEdit = (product: ProductDto) => {
    setEditingProduct(product)
    setIsEditDialogOpen(true)
  }

  const handleManageMedia = (product: ProductDto) => {
    setMediaProduct(product)
    setIsMediaDialogOpen(true)
  }

  const handleToggleActive = (product: ProductDto) => {
    executeToggleActive({
      id: product.id,
      name: product.name,
      description: product.description ?? undefined,
      price: product.price,
      isActive: !product.isActive,
    })
  }
  const columns: ColumnDef<ProductDto>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <PackageIcon className="h-4 w-4 text-muted-foreground" />
          <span>Produto</span>
        </div>
      ),
      cell: ({ row }) => {
        return <span className="ml-2 font-medium">{row.getValue('name')}</span>
      },
    },
    {
      accessorKey: 'description',
      header: () => (
        <div className="flex items-center gap-2">
          <TextIcon className="h-4 w-4 text-muted-foreground" />
          <span>Descrição</span>
        </div>
      ),
      cell: ({ row }) => {
        const description = row.getValue('description') as string | null
        return description || <span className="text-muted-foreground">-</span>
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
        const active = row.getValue('isActive') as boolean
        return active ? (
          <Badge variant="default">Ativo</Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
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
        const price = row.getValue('price') as number
        return formatCurrency(price)
      },
    },
    {
      accessorKey: 'mediaCount',
      header: () => (
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span>Mídias</span>
        </div>
      ),
      cell: ({ row }) => {
        const count = row.getValue('mediaCount') as number
        if (count === 0) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {count} {count === 1 ? 'mídia' : 'mídias'}
            </span>
          </div>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const product = row.original
        return (
          <ProductTableDropdownMenu
            product={product}
            onDelete={() => {
              setDeletingProduct(product)
              setIsDeleteDialogOpen(true)
            }}
            onEdit={() => handleEdit(product)}
            onManageMedia={() => handleManageMedia(product)}
            onToggleActive={() => handleToggleActive(product)}
            isTogglingActive={isTogglingActive}
          />
        )
      },
    },
  ]

  return (
    <>
      {/* Sheet de edição fora da tabela para sobreviver ao re-render */}
      <Sheet
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setEditingProduct(null)
        }}
      >
        {editingProduct && (
          <UpsertProductDialogContent
            key={editingProduct.id}
            defaultValues={{
              id: editingProduct.id,
              name: editingProduct.name,
              description: editingProduct.description || '',
              price: editingProduct.price,
              isActive: editingProduct.isActive,
            }}
            setIsOpen={setIsEditDialogOpen}
            isOpen={isEditDialogOpen}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      {/* Dialog de gerenciamento de mídias */}
      {mediaProduct && (
        <ProductMediaDialog
          productId={mediaProduct.id}
          productName={mediaProduct.name}
          open={isMediaDialogOpen}
          onOpenChange={(open) => {
            setIsMediaDialogOpen(open)
            if (!open) setMediaProduct(null)
          }}
        />
      )}

      {/* Dialog de deleção individual fora da tabela */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingProduct(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente o produto{' '}
            <span className="font-bold text-foreground">
              {deletingProduct?.name}
            </span>{' '}
            do catálogo.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingProduct) executeDelete({ id: deletingProduct.id })
        }}
        isLoading={isDeletingIndividual}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Dialog de deleção em massa fora da tabela */}
      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Excluir produto(s) selecionados?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            <br />
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} produto(s) permanentemente do sistema.
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => executeBulkDelete({ ids: bulkDeleteIds })}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      <DataTable
        columns={columns}
        data={products}
        enableSelection={true}
        bulkActions={({ selectedRows, resetSelection }) => {
          resetSelectionRef.current = resetSelection
          return (
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => {
                setBulkDeleteIds(selectedRows.map((row) => row.id))
                setIsBulkDeleteOpen(true)
              }}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Deletar
            </Button>
          )
        }}
      />
    </>
  )
}
