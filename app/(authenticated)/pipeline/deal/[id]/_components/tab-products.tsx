'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2 } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/_components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/_components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { addDealProduct } from '@/_actions/deal/add-deal-product'
import { removeDealProduct } from '@/_actions/deal/remove-deal-product'
import type { DealDetailsDto } from '@/_data-access/deal/get-deal-details'
import type { ProductDto } from '@/_data-access/product/get-products'
import { formatCurrency } from '@/_helpers/format-currency'

interface TabProductsProps {
  deal: DealDetailsDto
  products: ProductDto[]
}

const TabProducts = ({ deal, products }: TabProductsProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)

  const { execute: executeAdd, isPending: isAdding } = useAction(
    addDealProduct,
    {
      onSuccess: () => {
        toast.success('Produto adicionado!')
        setIsDialogOpen(false)
        resetForm()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao adicionar produto.')
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeDealProduct,
    {
      onSuccess: () => {
        toast.success('Produto removido!')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao remover produto.')
      },
    },
  )

  const resetForm = () => {
    setSelectedProductId('')
    setQuantity(1)
    setUnitPrice(0)
  }

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId)
    const product = products.find((p) => p.id === productId)
    if (product) {
      setUnitPrice(product.price)
    }
  }

  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast.error('Selecione um produto.')
      return
    }
    executeAdd({
      dealId: deal.id,
      productId: selectedProductId,
      quantity,
      unitPrice,
      discountType: 'percentage',
      discountValue: 0,
    })
  }

  // Produtos não adicionados ao deal
  const availableProducts = products.filter(
    (p) => !deal.products.some((dp) => dp.productId === p.id),
  )

  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Produtos</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={availableProducts.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
              <DialogDescription>
                Selecione um produto e defina quantidade e preço.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={handleProductSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Unitário</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={unitPrice}
                    onChange={(e) =>
                      setUnitPrice(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-xl font-bold">
                  {formatCurrency(quantity * unitPrice)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddProduct} disabled={isAdding}>
                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {deal.products.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum produto adicionado ainda.
          </div>
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isRemoving}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remover produto?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover &quot;
                                {product.productName}&quot; deste deal?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  executeRemove({ dealProductId: product.id })
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
    </Card>
  )
}

export default TabProducts
