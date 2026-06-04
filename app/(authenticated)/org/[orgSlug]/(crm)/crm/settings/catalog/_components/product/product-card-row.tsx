'use client'

import {
  ImageIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import type { ProductDto } from '@/_data-access/product/get-products'

interface ProductCardRowProps {
  product: ProductDto
  isSelected: boolean
  onSelectionChange: (checked: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

export function ProductCardRow({
  product,
  isSelected,
  onSelectionChange,
  onEdit,
  onDelete,
}: ProductCardRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border px-4 py-3 transition-all',
        'hover:border-primary/30 hover:bg-primary/10 hover:shadow-sm',
        isSelected
          ? 'border-primary/30 bg-primary/10'
          : 'border-border bg-card',
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelectionChange(Boolean(checked))}
        aria-label={`Selecionar ${product.name}`}
      />

      {/* Nome */}
      <div className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium">{product.name}</span>
        {product.description && (
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {product.description}
          </p>
        )}
      </div>

      {/* Preço */}
      <div className="hidden shrink-0 text-sm font-medium sm:block">
        {formatCurrency(product.price)}
      </div>

      {/* Status */}
      <div className="shrink-0">
        {product.isActive ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
            Ativo
          </Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
        )}
      </div>

      {/* Mídias */}
      <div className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <ImageIcon className="size-3.5" />
        {product.mediaCount > 0
          ? `${product.mediaCount} mídia${product.mediaCount === 1 ? '' : 's'}`
          : 'Sem mídia'}
      </div>

      {/* Dropdown de ações */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu de ações</span>
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
