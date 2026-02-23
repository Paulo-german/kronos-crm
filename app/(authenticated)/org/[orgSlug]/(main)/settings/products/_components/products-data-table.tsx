'use client'

import { useState, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DollarSignIcon, PackageIcon, TextIcon, TrashIcon } from 'lucide-react'
import { DataTable } from '@/_components/data-table'
import type { ProductDto } from '@/_data-access/product/get-products'
import { formatCurrency } from '@/_utils/format-currency'
import ProductTableDropdownMenu from './table-dropdown-menu'
import { Button } from '@/_components/ui/button'
import { Sheet } from '@/_components/ui/sheet'
import { useAction } from 'next-safe-action/hooks'
import { bulkDeleteProducts } from '@/_actions/product/bulk-delete-products'
import { deleteProduct } from '@/_actions/product/delete-product'
import { updateProduct } from '@/_actions/product/update-product'
import { toast } from 'sonner'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertProductDialogContent from './upsert-dialog-content'

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

  const handleEdit = (product: ProductDto) => {
    setEditingProduct(product)
    setIsEditDialogOpen(true)
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
            }}
            setIsOpen={setIsEditDialogOpen}
            isOpen={isEditDialogOpen}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

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
