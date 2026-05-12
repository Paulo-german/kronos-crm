'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ColumnDef } from '@tanstack/react-table'
import {
  DollarSignIcon,
  ListIcon,
  Loader2,
  Plus,
  PowerIcon,
  TagIcon,
  TextIcon,
  TrashIcon,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { DataTable } from '@/_components/data-table'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/_components/ui/sheet'
import { Switch } from '@/_components/ui/switch'
import { Textarea } from '@/_components/ui/textarea'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { CurrencyInput } from '@/_components/form-controls/currency-input'

import { createPromotion } from '@/_actions/promotion/create-promotion'
import { updatePromotion } from '@/_actions/promotion/update-promotion'
import { deletePromotion } from '@/_actions/promotion/delete-promotion'
import {
  createPromotionSchema,
  type CreatePromotionInput,
} from '@/_actions/promotion/create-promotion/schema'
import type { UpdatePromotionInput } from '@/_actions/promotion/update-promotion/schema'
import { formatCurrency } from '@/_utils/format-currency'
import type { PromotionDto } from '@/_data-access/promotion/get-promotions'

// ─── Dropdown de ações por linha ────────────────────────────────────────────

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { MoreHorizontal, PencilIcon } from 'lucide-react'

interface PromotionRowActionsProps {
  promotion: PromotionDto
  onEdit: (promotion: PromotionDto) => void
  onDelete: (promotion: PromotionDto) => void
}

function PromotionRowActions({ promotion, onEdit, onDelete }: PromotionRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(promotion)}>
          <PencilIcon className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(promotion)}
        >
          <TrashIcon className="mr-2 h-4 w-4" />
          Deletar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Form Upsert (Sheet) ─────────────────────────────────────────────────────

interface UpsertPromotionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: PromotionDto
  onUpdate: (data: UpdatePromotionInput) => void
  isUpdating: boolean
}

function UpsertPromotionSheet({
  open,
  onOpenChange,
  defaultValues,
  onUpdate,
  isUpdating,
}: UpsertPromotionSheetProps) {
  const isEditing = !!defaultValues?.id

  const form = useForm<CreatePromotionInput>({
    resolver: zodResolver(createPromotionSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      price: defaultValues?.price ?? undefined,
      isActive: defaultValues?.isActive ?? true,
      items: [],
    },
  })

  // Reseta o form ao abrir com novos valores
  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name ?? '',
        description: defaultValues?.description ?? '',
        price: defaultValues?.price ?? undefined,
        isActive: defaultValues?.isActive ?? true,
        items: [],
      })
    }
  }, [open, defaultValues, form])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createPromotion,
    {
      onSuccess: () => {
        toast.success('Promoção criada com sucesso!')
        onOpenChange(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar promoção.')
      },
    },
  )

  const onSubmit = (data: CreatePromotionInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate({ id: defaultValues.id, ...data })
    } else {
      executeCreate(data)
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <SheetContent className="overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Promoção' : 'Nova Promoção'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações da promoção.'
            : 'Adicione uma nova promoção ao catálogo.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome da promoção" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descrição da promoção"
                    className="resize-none"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$) *</FormLabel>
                <FormControl>
                  <CurrencyInput
                    placeholder="R$ 0,00"
                    value={field.value ?? ''}
                    onValueChange={(values) => {
                      field.onChange(values.floatValue ?? undefined)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-t pt-4">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Promoção ativa</FormLabel>
                    <FormDescription>
                      Promoções ativas ficam disponíveis para o agente IA
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvar
                </div>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </SheetContent>
  )
}

// ─── PromotionsTab (componente principal) ────────────────────────────────────

interface PromotionsTabProps {
  promotions: PromotionDto[]
}

export function PromotionsTab({ promotions }: PromotionsTabProps) {
  const [editingPromotion, setEditingPromotion] = useState<PromotionDto | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)

  const [deletingPromotion, setDeletingPromotion] = useState<PromotionDto | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const resetSelectionRef = useRef<(() => void) | null>(null)

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deletePromotion,
    {
      onSuccess: () => {
        toast.success('Promoção excluída com sucesso.')
        setIsDeleteDialogOpen(false)
        setDeletingPromotion(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao excluir promoção.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updatePromotion,
    {
      onSuccess: () => {
        toast.success('Promoção atualizada com sucesso!')
        setIsSheetOpen(false)
        setEditingPromotion(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar promoção.')
      },
    },
  )

  const handleEdit = (promotion: PromotionDto) => {
    setEditingPromotion(promotion)
    setIsSheetOpen(true)
  }

  const handleDelete = (promotion: PromotionDto) => {
    setDeletingPromotion(promotion)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdate = (data: UpdatePromotionInput) => {
    executeUpdate(data)
  }

  const columns: ColumnDef<PromotionDto>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-muted-foreground" />
          <span>Nome</span>
        </div>
      ),
      cell: ({ row }) => (
        <span className="ml-2 font-medium">{row.getValue('name')}</span>
      ),
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
        if (!description) return <span className="text-muted-foreground">-</span>
        return (
          <span className="line-clamp-1 max-w-xs text-sm text-muted-foreground">
            {description}
          </span>
        )
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
        return <span className="font-medium">{formatCurrency(price)}</span>
      },
    },
    {
      accessorKey: 'itemCount',
      header: () => (
        <div className="flex items-center gap-2">
          <ListIcon className="h-4 w-4 text-muted-foreground" />
          <span>Itens</span>
        </div>
      ),
      cell: ({ row }) => {
        const count = row.getValue('itemCount') as number
        if (count === 0) return <span className="text-muted-foreground">-</span>
        return (
          <span className="text-sm">
            {count} {count === 1 ? 'item' : 'itens'}
          </span>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: () => (
        <div className="flex items-center gap-2">
          <PowerIcon className="h-4 w-4 text-muted-foreground" />
          <span>Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const active = row.getValue('isActive') as boolean
        return active ? (
          <Badge variant="default">Ativo</Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const promotion = row.original
        return (
          <PromotionRowActions
            promotion={promotion}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )
      },
    },
  ]

  return (
    <>
      {/* Sheet de criação */}
      <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
        <UpsertPromotionSheet
          open={isCreateSheetOpen}
          onOpenChange={setIsCreateSheetOpen}
          onUpdate={handleUpdate}
          isUpdating={false}
        />
      </Sheet>

      {/* Sheet de edição (fora da tabela para sobreviver ao re-render) */}
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open)
          if (!open) setEditingPromotion(null)
        }}
      >
        {editingPromotion && (
          <UpsertPromotionSheet
            key={editingPromotion.id}
            open={isSheetOpen}
            onOpenChange={(open) => {
              setIsSheetOpen(open)
              if (!open) setEditingPromotion(null)
            }}
            defaultValues={editingPromotion}
            onUpdate={handleUpdate}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      {/* Dialog de confirmação de exclusão individual */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeletingPromotion(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente a promoção{' '}
            <span className="font-bold text-foreground">
              {deletingPromotion?.name}
            </span>{' '}
            do catálogo.
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingPromotion) executeDelete({ id: deletingPromotion.id })
        }}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Dialog de confirmação de exclusão em massa */}
      <ConfirmationDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title="Excluir promoções selecionadas?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover{' '}
            <span className="font-semibold text-foreground">
              {bulkDeleteIds.length} promoção(ões) permanentemente.
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          bulkDeleteIds.forEach((id) => executeDelete({ id }))
          setIsBulkDeleteOpen(false)
          resetSelectionRef.current?.()
        }}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      {/* Cabeçalho da tab + botão de criação */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Promoções</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os pacotes promocionais do catálogo.
          </p>
        </div>
        <Button onClick={() => setIsCreateSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Promoção
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={promotions}
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
