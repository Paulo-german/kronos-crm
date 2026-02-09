'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogTrigger } from '@/_components/ui/alert-dialog'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  MoreHorizontalIcon,
  ClipboardCopyIcon,
  EditIcon,
  TrashIcon,
} from 'lucide-react'
import DeleteProductDialogContent from './delete-dialog-content'
import { ProductDto } from '@/_data-access/product/get-products'

interface ProductTableDropdownMenuProps {
  product: ProductDto
  onDelete: () => void
  onEdit: () => void
}

const ProductTableDropdownMenu = ({
  product,
  onDelete,
  onEdit,
}: ProductTableDropdownMenuProps) => {
  const [deleteIsOpen, setDeleteIsOpen] = useState(false)

  return (
    <div className="flex items-center justify-end">
      <AlertDialog open={deleteIsOpen} onOpenChange={setDeleteIsOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontalIcon size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(product.id)
                toast.success('ID copiado para a área de transferência.')
              }}
            >
              <ClipboardCopyIcon size={16} />
              Copiar ID
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-1.5" onSelect={onEdit}>
              <EditIcon size={16} />
              Editar
            </DropdownMenuItem>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="gap-1.5 text-destructive hover:text-destructive">
                <TrashIcon size={16} />
                Deletar
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <DeleteProductDialogContent
          productName={product.name}
          onDelete={onDelete}
        />
      </AlertDialog>
    </div>
  )
}

export default ProductTableDropdownMenu
