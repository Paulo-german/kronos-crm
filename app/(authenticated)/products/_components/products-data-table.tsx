'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Package } from 'lucide-react'
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
      header: 'Produto',
      cell: ({ row }) => {
        const product = row.original
        return (
          <Link
            href={`/products/${product.id}`}
            className="flex items-center gap-2 font-medium hover:underline"
          >
            <Package className="h-4 w-4 text-muted-foreground" />
            {product.name}
          </Link>
        )
      },
    },
    {
      accessorKey: 'description',
      header: 'Descrição',
      cell: ({ row }) => {
        const description = row.getValue('description') as string | null
        return description || <span className="text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'price',
      header: 'Preço',
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

  return <DataTable columns={columns} data={products} />
}
