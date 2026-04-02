'use client'

import { useState } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2, Tag } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { getLabelColor } from '@/_lib/constants/label-colors'
import UpsertLabelDialog from './upsert-label-dialog'
import DeleteLabelDialog from './delete-label-dialog'
import type { ConversationLabelDto } from '@/_data-access/conversation-label/get-conversation-labels'

interface LabelsListProps {
  labels: ConversationLabelDto[]
}

const LabelsList = ({ labels }: LabelsListProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState<ConversationLabelDto | null>(null)
  const [deletingLabel, setDeletingLabel] = useState<ConversationLabelDto | null>(null)

  const handleEditClick = (label: ConversationLabelDto) => {
    setEditingLabel(label)
  }

  const handleDeleteClick = (label: ConversationLabelDto) => {
    setDeletingLabel(label)
  }

  const handleEditOpenChange = (open: boolean) => {
    if (!open) setEditingLabel(null)
  }

  const handleDeleteOpenChange = (open: boolean) => {
    if (!open) setDeletingLabel(null)
  }

  return (
    <>
      {/* Dialog de criação */}
      <UpsertLabelDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {/* Dialog de edição */}
      {editingLabel && (
        <UpsertLabelDialog
          key={editingLabel.id}
          open={!!editingLabel}
          onOpenChange={handleEditOpenChange}
          defaultValues={editingLabel}
        />
      )}

      {/* Dialog de exclusão */}
      {deletingLabel && (
        <DeleteLabelDialog
          open={!!deletingLabel}
          onOpenChange={handleDeleteOpenChange}
          labelId={deletingLabel.id}
          labelName={deletingLabel.name}
        />
      )}

      <div className="rounded-lg border bg-card">
        {/* Cabeçalho com botão de criar */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium text-muted-foreground">
            {labels.length} {labels.length === 1 ? 'etiqueta' : 'etiquetas'}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova Etiqueta
          </Button>
        </div>

        {/* Lista de etiquetas */}
        {labels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Nenhuma etiqueta criada</p>
              <p className="text-sm text-muted-foreground">
                Crie etiquetas para organizar e filtrar suas conversas do inbox.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Criar primeira etiqueta
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {labels.map((label) => {
              const colorConfig = getLabelColor(label.color)
              return (
                <li
                  key={label.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Dot de cor */}
                    <span
                      className={`h-3 w-3 flex-shrink-0 rounded-full ${colorConfig.dot}`}
                    />
                    {/* Badge com nome + cor de fundo */}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorConfig.bg} ${colorConfig.text} ${colorConfig.dark_text}`}
                    >
                      {label.name}
                    </span>
                  </div>

                  {/* Menu de ações */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações para {label.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(label)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(label)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

export default LabelsList
