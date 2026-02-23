'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, TrashIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { Sheet } from '@/_components/ui/sheet'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertProductDialog from './upsert-product-dialog'
import { addDealProduct } from '@/_actions/deal/add-deal-product'
import { removeDealProduct } from '@/_actions/deal/remove-deal-product'
import { updateDealProduct } from '@/_actions/deal/update-deal-product'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { ProductDto } from '@/_data-access/product/get-products'
import { formatCurrency } from '@/_utils/format-currency'

interface TabProductsProps {
  deal: DealDetailsDto
  products: ProductDto[]
}

const TabProducts = ({ deal, products }: TabProductsProps) => {
  const params = useParams()
  const orgSlug = params.orgSlug as string
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<
    DealDetailsDto['products'][0] | null
  >(null)
  const [deletingProduct, setDeletingProduct] = useState<
    DealDetailsDto['products'][0] | null
  >(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const isEditing = !!editingProduct

  const { execute: executeAdd, isPending: isAdding } = useAction(
    addDealProduct,
    {
      onSuccess: () => {
        toast.success('Produto adicionado!')
        setIsDialogOpen(false)
        setEditingProduct(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao adicionar produto.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateDealProduct,
    {
      onSuccess: () => {
        toast.success('Produto atualizado com sucesso!')
        setIsDialogOpen(false)
        setEditingProduct(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar produto.')
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeDealProduct,
    {
      onSuccess: () => {
        toast.success('Produto removido com sucesso!')
        setIsDeleteDialogOpen(false)
        setDeletingProduct(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao remover produto.')
      },
    },
  )

  const handleProductEdit = (product: DealDetailsDto['products'][0]) => {
    setEditingProduct(product)
    setIsDialogOpen(true)
  }

  const handleFormSubmit = (
    data: {
      productId: string
      quantity: number
      unitPrice: number
      discountType: 'percentage' | 'fixed'
      discountValue: number
    } & { id?: string },
  ) => {
    if (data.id) {
      // Modo edição
      executeUpdate({
        dealProductId: data.id,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountType: data.discountType,
        discountValue: data.discountValue,
      })
    } else {
      // Modo criação
      executeAdd({
        dealId: deal.id,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountType: data.discountType,
        discountValue: data.discountValue,
      })
    }
  }

  // Produtos não adicionados ao deal (para o select no modo criação)
  const availableProducts = products.filter(
    (produto) => !deal.products.some((dp) => dp.productId === produto.id),
  )

  // Default values para o dialog
  const dialogDefaultValues = editingProduct
    ? {
        id: editingProduct.id,
        productId: editingProduct.productId,
        quantity: editingProduct.quantity,
        unitPrice: editingProduct.unitPrice,
        discountType: editingProduct.discountType,
        discountValue: editingProduct.discountValue,
      }
    : undefined

  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Produtos</CardTitle>

        <Sheet
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingProduct(null)
            }
          }}
        >
          <Button
            size="sm"
            disabled={availableProducts.length === 0 && !isEditing}
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Button>

          <UpsertProductDialog
            key={editingProduct?.id ?? 'new'} // Força reset ao mudar contexto
            isOpen={isDialogOpen}
            defaultValues={dialogDefaultValues}
            products={isEditing ? products : availableProducts}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsDialogOpen(false)}
            isPending={isAdding || isUpdating}
          />
        </Sheet>
      </CardHeader>

      <CardContent>
        {deal.products.length === 0 ? (
          products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground">
              <p>Sua organização ainda não possui produtos cadastrados.</p>
              <Button size="sm" asChild>
                <Link href={`/org/${orgSlug}/settings/products`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ir para Produtos
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground">
              <p>
                Você ainda não possui nenhum produto vinculado a este negócio.
              </p>
              <Button
                size="sm"
                disabled={availableProducts.length === 0 && !isEditing}
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Vincular Produto
              </Button>
            </div>
          )
        ) : (
          <>
            <div className="overflow-hidden rounded-md border border-border/50">
              <Table className="bg-secondary/20">
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card">
                  {deal.products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.productName}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.discountType === 'percentage'
                          ? `${product.discountValue}%`
                          : formatCurrency(product.discountValue)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.subtotal)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {/* Botão Editar */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleProductEdit(product)}
                            title="Editar produto"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>

                          {/* Botão Deletar */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingProduct(product)
                              setIsDeleteDialogOpen(true)
                            }}
                            title="Remover produto"
                          >
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end border-t border-border pt-4">
              <div className="text-right">
                <span className="text-sm text-muted-foreground">Total: </span>
                <span className="text-xl font-bold text-[#00b37e]">
                  {formatCurrency(deal.totalValue)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingProduct(null)
        }}
        title="Remover produto?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente o produto{' '}
            <strong className="font-semibold text-foreground">
              {deletingProduct?.productName}
            </strong>{' '}
            deste negócio?
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingProduct)
            executeRemove({ dealProductId: deletingProduct.id })
        }}
        isLoading={isRemoving}
        confirmLabel="Confirmar Exclusão"
      />
    </Card>
  )
}

export default TabProducts
