'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  TrashIcon,
  PackageIcon,
  WrenchIcon,
  TagIcon,
  Loader2,
} from 'lucide-react'
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
import { Badge } from '@/_components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Label } from '@/_components/ui/label'
import { Input } from '@/_components/ui/input'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { addDealLineItem } from '@/_actions/deal/add-deal-line-item'
import { updateDealLineItem } from '@/_actions/deal/update-deal-line-item'
import { removeDealLineItem } from '@/_actions/deal/remove-deal-line-item'
import type {
  DealDetailsDto,
  DealLineItemDto,
} from '@/_data-access/deal/get-deal-details'
import type { ProductDto } from '@/_data-access/product/get-products'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { PromotionDto } from '@/_data-access/promotion/get-promotions'
import { formatCurrency } from '@/_utils/format-currency'

type ItemType = 'PRODUCT' | 'SERVICE' | 'PROMOTION'
type DiscountType = 'percentage' | 'fixed'

interface TabProductsProps {
  deal: DealDetailsDto
  lineItems: DealLineItemDto[]
  totalValue: number
  products: ProductDto[]
  services: ServiceDto[]
  promotions: PromotionDto[]
}

const ITEM_TYPE_CONFIG: Record<
  ItemType,
  {
    label: string
    icon: React.ReactNode
    variant: 'default' | 'secondary' | 'outline'
  }
> = {
  PRODUCT: {
    label: 'Produto',
    icon: <PackageIcon className="h-3 w-3" />,
    variant: 'default',
  },
  SERVICE: {
    label: 'Serviço',
    icon: <WrenchIcon className="h-3 w-3" />,
    variant: 'secondary',
  },
  PROMOTION: {
    label: 'Promoção',
    icon: <TagIcon className="h-3 w-3" />,
    variant: 'outline',
  },
}

const getLineItemName = (item: DealLineItemDto): string =>
  item.product?.name ?? item.service?.name ?? item.promotion?.name ?? '—'

const TabProducts = ({
  deal,
  lineItems,
  totalValue,
  products,
  services,
  promotions,
}: TabProductsProps) => {
  const [isLineItemSheetOpen, setIsLineItemSheetOpen] = useState(false)
  const [addItemType, setAddItemType] = useState<ItemType>('PRODUCT')
  const [addItemId, setAddItemId] = useState<string>('')
  const [addQuantity, setAddQuantity] = useState<number>(1)
  const [addUnitPrice, setAddUnitPrice] = useState<number>(0)
  const [addDiscountType, setAddDiscountType] =
    useState<DiscountType>('percentage')
  const [addDiscountValue, setAddDiscountValue] = useState<number>(0)

  const [editingLineItem, setEditingLineItem] =
    useState<DealLineItemDto | null>(null)
  const [editQuantity, setEditQuantity] = useState<number>(1)
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0)
  const [editDiscountType, setEditDiscountType] =
    useState<DiscountType>('percentage')
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0)

  const [deletingLineItem, setDeletingLineItem] =
    useState<DealLineItemDto | null>(null)

  const { execute: executeAddLineItem, isPending: isAddingLineItem } =
    useAction(addDealLineItem, {
      onSuccess: () => {
        toast.success('Item adicionado ao negócio!')
        setIsLineItemSheetOpen(false)
        resetAddForm()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao adicionar item.')
      },
    })

  const { execute: executeUpdateLineItem, isPending: isUpdatingLineItem } =
    useAction(updateDealLineItem, {
      onSuccess: () => {
        toast.success('Item atualizado com sucesso!')
        setEditingLineItem(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar item.')
      },
    })

  const { execute: executeRemoveLineItem, isPending: isRemovingLineItem } =
    useAction(removeDealLineItem, {
      onSuccess: () => {
        toast.success('Item removido com sucesso!')
        setDeletingLineItem(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao remover item.')
      },
    })

  const resetAddForm = () => {
    setAddItemType('PRODUCT')
    setAddItemId('')
    setAddQuantity(1)
    setAddUnitPrice(0)
    setAddDiscountType('percentage')
    setAddDiscountValue(0)
  }

  const handleAddItemTypeChange = (value: ItemType) => {
    setAddItemType(value)
    setAddItemId('')
    setAddUnitPrice(0)
  }

  const handleAddItemSelect = (id: string) => {
    setAddItemId(id)

    if (addItemType === 'PRODUCT') {
      const product = products.find((product) => product.id === id)
      if (product) setAddUnitPrice(product.price)
      return
    }
    if (addItemType === 'SERVICE') {
      const service = services.find((service) => service.id === id)
      if (service) setAddUnitPrice(Number(service.price))
      return
    }
    const promotion = promotions.find((promotion) => promotion.id === id)
    if (promotion) setAddUnitPrice(promotion.price)
  }

  const handleAddLineItemSubmit = () => {
    if (!addItemId || addQuantity < 1 || addUnitPrice < 0) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    executeAddLineItem({
      dealId: deal.id,
      itemType: addItemType,
      productId: addItemType === 'PRODUCT' ? addItemId : undefined,
      serviceId: addItemType === 'SERVICE' ? addItemId : undefined,
      promotionId: addItemType === 'PROMOTION' ? addItemId : undefined,
      quantity: addQuantity,
      unitPrice: addUnitPrice,
      discountType: addDiscountType,
      discountValue: addDiscountValue,
    })
  }

  const handleEditLineItem = (item: DealLineItemDto) => {
    setEditingLineItem(item)
    setEditQuantity(item.quantity)
    setEditUnitPrice(item.unitPrice)
    setEditDiscountType(item.discountType)
    setEditDiscountValue(item.discountValue)
  }

  const handleUpdateLineItemSubmit = () => {
    if (!editingLineItem) return

    executeUpdateLineItem({
      lineItemId: editingLineItem.id,
      quantity: editQuantity,
      unitPrice: editUnitPrice,
      discountType: editDiscountType,
      discountValue: editDiscountValue,
    })
  }

  const activeProducts = products.filter((product) => product.isActive)
  const activeServices = services.filter((service) => service.isActive)
  const activePromotions = promotions.filter((promotion) => promotion.isActive)

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Itens do Negócio</CardTitle>

          <Button size="sm" onClick={() => setIsLineItemSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
        </CardHeader>

        <CardContent>
          {lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center text-muted-foreground">
              <p>Nenhum item adicionado a este negócio.</p>
              <Button size="sm" onClick={() => setIsLineItemSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md border border-border/50">
                <Table className="bg-secondary/20">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-card">
                    {lineItems.map((item) => {
                      const config = ITEM_TYPE_CONFIG[item.itemType]
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge
                              variant={config.variant}
                              className="flex w-fit items-center gap-1"
                            >
                              {config.icon}
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getLineItemName(item)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.discountType === 'percentage'
                              ? `${item.discountValue}%`
                              : formatCurrency(item.discountValue)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(item.subtotal)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditLineItem(item)}
                                title="Editar item"
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingLineItem(item)}
                                title="Remover item"
                              >
                                <TrashIcon className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">
                    Total geral:{' '}
                  </span>
                  <span className="text-xl font-bold text-kronos-green">
                    {formatCurrency(totalValue)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={isLineItemSheetOpen}
        onOpenChange={(open) => {
          setIsLineItemSheetOpen(open)
          if (!open) resetAddForm()
        }}
      >
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Adicionar Item ao Negócio</SheetTitle>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Select
                value={addItemType}
                onValueChange={(value) =>
                  handleAddItemTypeChange(value as ItemType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT">Produto</SelectItem>
                  <SelectItem value="SERVICE">Serviço</SelectItem>
                  <SelectItem value="PROMOTION">Promoção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Item</Label>
              <Select value={addItemId} onValueChange={handleAddItemSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o item" />
                </SelectTrigger>
                <SelectContent>
                  {addItemType === 'PRODUCT' &&
                    activeProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} — {formatCurrency(product.price)}
                      </SelectItem>
                    ))}
                  {addItemType === 'SERVICE' &&
                    activeServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} — {service.duration} min
                      </SelectItem>
                    ))}
                  {addItemType === 'PROMOTION' &&
                    activePromotions.map((promotion) => (
                      <SelectItem key={promotion.id} value={promotion.id}>
                        {promotion.name} — {formatCurrency(promotion.price)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={addQuantity}
                onChange={(event) => setAddQuantity(Number(event.target.value))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Preço Unitário</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={addUnitPrice}
                onChange={(event) =>
                  setAddUnitPrice(Number(event.target.value))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tipo de Desconto</Label>
              <Select
                value={addDiscountType}
                onValueChange={(value) =>
                  setAddDiscountType(value as DiscountType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Valor do Desconto</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={addDiscountValue}
                onChange={(event) =>
                  setAddDiscountValue(Number(event.target.value))
                }
              />
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLineItemSheetOpen(false)
                  resetAddForm()
                }}
                disabled={isAddingLineItem}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddLineItemSubmit}
                disabled={isAddingLineItem}
              >
                {isAddingLineItem ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Adicionar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!editingLineItem}
        onOpenChange={(open) => {
          if (!open) setEditingLineItem(null)
        }}
      >
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar Item</SheetTitle>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={editQuantity}
                onChange={(event) =>
                  setEditQuantity(Number(event.target.value))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Preço Unitário</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editUnitPrice}
                onChange={(event) =>
                  setEditUnitPrice(Number(event.target.value))
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tipo de Desconto</Label>
              <Select
                value={editDiscountType}
                onValueChange={(value) =>
                  setEditDiscountType(value as DiscountType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Valor do Desconto</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editDiscountValue}
                onChange={(event) =>
                  setEditDiscountValue(Number(event.target.value))
                }
              />
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingLineItem(null)}
                disabled={isUpdatingLineItem}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateLineItemSubmit}
                disabled={isUpdatingLineItem}
              >
                {isUpdatingLineItem ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationDialog
        open={!!deletingLineItem}
        onOpenChange={(open) => {
          if (!open) setDeletingLineItem(null)
        }}
        title="Remover item?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente o item{' '}
            <strong className="font-semibold text-foreground">
              {deletingLineItem ? getLineItemName(deletingLineItem) : ''}
            </strong>{' '}
            deste negócio.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingLineItem)
            executeRemoveLineItem({ lineItemId: deletingLineItem.id })
        }}
        isLoading={isRemovingLineItem}
        confirmLabel="Confirmar Exclusão"
      />
    </div>
  )
}

export default TabProducts
