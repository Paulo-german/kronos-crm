'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogTrigger } from '@/_components/ui/alert-dialog'
import { Button } from '@/_components/ui/button'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'
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
import UpsertProductDialogContent from './upsert-dialog-content'
import { ProductDto } from '@/_data-access/product/get-products'
import type { UpdateProductInput } from '@/_actions/product/update-product/schema'

interface ProductTableDropdownMenuProps {
  product: ProductDto
  onDelete: () => void
  onUpdate: (data: UpdateProductInput) => void
}

const ProductTableDropdownMenu = ({
  product,
  onDelete,
  onUpdate,
}: ProductTableDropdownMenuProps) => {
  const [editDialogOpen, setEditDialogIsOpen] = useState(false)

  return (
    <AlertDialog>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogIsOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-8w h-8 p-0">
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
            <DialogTrigger asChild>
              <DropdownMenuItem className="gap-1.5">
                <EditIcon size={16} />
                Editar
              </DropdownMenuItem>
            </DialogTrigger>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="gap-1.5 text-destructive hover:text-destructive">
                <TrashIcon size={16} />
                Deletar
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <UpsertProductDialogContent
          defaultValues={{
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price,
          }}
          setIsOpen={setEditDialogIsOpen}
          isOpen={editDialogOpen}
          onUpdate={onUpdate}
        />
      </Dialog>

      <DeleteProductDialogContent
        productName={product.name}
        onDelete={onDelete}
      />
    </AlertDialog>
  )
}

export default ProductTableDropdownMenu
