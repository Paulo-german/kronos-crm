'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DollarSignIcon, PackageIcon, TextIcon, TrashIcon } from 'lucide-react'
import Link from 'next/link'
import { DataTable } from '@/_components/data-table'
import type { ProductDto } from '@/_data-access/product/get-products'
import { formatCurrency } from '@/_utils/format-currency'
import ProductTableDropdownMenu from './table-dropdown-menu'

import { Button } from '@/_components/ui/button'

import { useAction } from 'next-safe-action/hooks'
import { bulkDeleteProducts } from '@/_actions/product/bulk-delete-products'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'
import ConfirmationDialogContent from '@/_components/confirmation-dialog-content'

interface ProductsDataTableProps {
  products: ProductDto[]
}

export function ProductsDataTable({ products }: ProductsDataTableProps) {
  // Hook para deletar em massa
  const { execute: executeBulkDelete, isExecuting: isDeleting } = useAction(
    bulkDeleteProducts,
    {
      onSuccess: ({ data }) => {
        toast.success(`${data?.count || 'Produtos'} excluídos com sucesso.`)
      },
      onError: () => {
        toast.error('Erro ao excluir produtos.')
      },
    },
  )
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
        const product = row.original
        return (
          <Link
            href={`/products/${product.id}`}
            className="ml-2 flex items-center gap-2 font-medium hover:underline"
          >
            {product.name}
          </Link>
        )
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
        return <ProductTableDropdownMenu product={product} />
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={products}
      enableSelection={true}
      bulkActions={({ selectedRows, resetSelection }) => (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-8"
                disabled={isDeleting}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Deletar
              </Button>
            </AlertDialogTrigger>
            <ConfirmationDialogContent
              title="Excluir produto(s) selecionados?"
              description={
                <p>
                  Esta ação não pode ser desfeita. Você está prestes a remover
                  <br />
                  <span className="font-semibold text-foreground">
                    {selectedRows.length} produto(s) permanentemente do sistema.
                  </span>
                </p>
              }
              icon={<TrashIcon />}
              variant="destructive"
            >
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const ids = selectedRows.map((r) => r.id)
                  executeBulkDelete({ ids })
                  resetSelection()
                }}
              >
                Sim, excluir
              </AlertDialogAction>
            </ConfirmationDialogContent>
          </AlertDialog>
        </>
      )}
    />
  )
}
