'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DollarSignIcon, Package, PackageIcon, TextIcon } from 'lucide-react'
import Link from 'next/link'
import { DataTable } from '@/_components/data-table'
import type { ProductDto } from '@/_data-access/product/get-products'
import { formatCurrency } from '@/_helpers/format-currency'
import ProductTableDropdownMenu from './table-dropdown-menu'

interface ProductsDataTableProps {
  products: ProductDto[]
}

export function ProductsDataTable({ products }: ProductsDataTableProps) {
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
      onDelete={(rows) => {
        console.log('Deletar produtos:', rows)
        // toast.info(`Simulação: Deletando ${rows.length} produtos...`)
      }}
    />
  )
}
