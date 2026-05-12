'use client'

import { useState } from 'react'
import { Plus, PencilIcon, CheckIcon, XIcon, TrashIcon, TagIcon } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/_components/ui/sheet'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Badge } from '@/_components/ui/badge'
import { Separator } from '@/_components/ui/separator'

import { createServiceCategory } from '@/_actions/service-category/create-service-category'
import { updateServiceCategory } from '@/_actions/service-category/update-service-category'
import { deleteServiceCategory } from '@/_actions/service-category/delete-service-category'
import type { ServiceCategoryDto } from '@/_data-access/service/get-service-categories'

interface ManageCategoriesSheetProps {
  categories: ServiceCategoryDto[]
}

const ManageCategoriesSheet = ({ categories }: ManageCategoriesSheetProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Rastreamento da categoria sendo editada inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createServiceCategory,
    {
      onSuccess: () => {
        toast.success('Categoria criada com sucesso.')
        setNewCategoryName('')
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar categoria.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateServiceCategory,
    {
      onSuccess: () => {
        toast.success('Categoria atualizada.')
        setEditingId(null)
        setEditingName('')
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar categoria.')
      },
    },
  )

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteServiceCategory,
    {
      onSuccess: () => {
        toast.success('Categoria removida.')
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao remover categoria.')
      },
    },
  )

  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim()
    if (trimmed.length < 2) {
      toast.error('Nome deve ter ao menos 2 caracteres.')
      return
    }
    executeCreate({ name: trimmed, isActive: true })
  }

  const handleStartEdit = (category: ServiceCategoryDto) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const handleConfirmEdit = (categoryId: string) => {
    const trimmed = editingName.trim()
    if (trimmed.length < 2) {
      toast.error('Nome deve ter ao menos 2 caracteres.')
      return
    }
    executeUpdate({ id: categoryId, name: trimmed })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = (category: ServiceCategoryDto) => {
    if (category._count.services > 0) {
      toast.error(
        `Não é possível remover a categoria "${category.name}" pois ela possui ${category._count.services} serviço(s) vinculado(s). Mova ou remova os serviços primeiro.`,
      )
      return
    }
    executeDelete({ id: category.id })
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <TagIcon className="mr-2 h-4 w-4" />
          Categorias
        </Button>
      </SheetTrigger>

      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Categorias de Serviço</SheetTitle>
          <SheetDescription>
            Organize seus serviços em categorias. Categorias com serviços vinculados não podem ser removidas.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Adicionar nova categoria */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Nova Categoria</p>
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleCreateCategory()
                  }
                }}
                disabled={isCreating}
              />
              <Button
                onClick={handleCreateCategory}
                disabled={isCreating || newCategoryName.trim().length < 2}
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Adicionar</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Lista de categorias existentes */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
            </p>

            {categories.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma categoria ainda. Crie uma acima.
              </p>
            )}

            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  {editingId === category.id ? (
                    // Modo de edição inline
                    <>
                      <Input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleConfirmEdit(category.id)
                          }
                          if (event.key === 'Escape') {
                            handleCancelEdit()
                          }
                        }}
                        disabled={isUpdating}
                        autoFocus
                        className="h-7 flex-1 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                        onClick={() => handleConfirmEdit(category.id)}
                        disabled={isUpdating}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                        <span className="sr-only">Confirmar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                      >
                        <XIcon className="h-3.5 w-3.5" />
                        <span className="sr-only">Cancelar</span>
                      </Button>
                    </>
                  ) : (
                    // Modo de visualização
                    <>
                      <span className="flex-1 text-sm font-medium">
                        {category.name}
                      </span>
                      {category._count.services > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {category._count.services}{' '}
                          {category._count.services === 1 ? 'serviço' : 'serviços'}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleStartEdit(category)}
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                        <span className="sr-only">Editar {category.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(category)}
                        disabled={isDeleting || category._count.services > 0}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        <span className="sr-only">Remover {category.name}</span>
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default ManageCategoriesSheet
