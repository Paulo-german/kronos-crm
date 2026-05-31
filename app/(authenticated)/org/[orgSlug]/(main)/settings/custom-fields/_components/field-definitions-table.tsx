'use client'

import { useState, useId, useEffect, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { EntityType, FieldType } from '@prisma/client'
import {
  GripVertical,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { reorderFieldDefinitions } from '@/_actions/field-definition/reorder-field-definitions'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'
import { UpsertFieldDialog } from './upsert-field-dialog'
import { DeleteFieldDialog } from './delete-field-dialog'

// Labels PT-BR para os tipos de campo
const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  SELECT: 'Seleção',
  DATE: 'Data',
  PHONE: 'Telefone',
  EMAIL: 'Email',
  URL: 'URL',
}

interface SortableFieldRowProps {
  definition: FieldDefinitionDto
  onEdit: (definition: FieldDefinitionDto) => void
  onDelete: (definition: FieldDefinitionDto) => void
}

const SortableFieldRow = ({
  definition,
  onEdit,
  onDelete,
}: SortableFieldRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: definition.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
    >
      {/* Handle de drag */}
      <span
        className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </span>

      {/* Label */}
      <span className="flex-1 text-sm font-medium">{definition.label}</span>

      {/* Badges de metadados */}
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="text-xs font-normal">
          {FIELD_TYPE_LABELS[definition.type]}
        </Badge>
        {definition.isRequired && (
          <Badge variant="outline" className="text-xs font-normal">
            Obrigatório
          </Badge>
        )}
      </div>

      {/* Menu de ações */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(definition)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(definition)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface SystemFieldRowProps {
  definition: FieldDefinitionDto
}

const SystemFieldRow = ({ definition }: SystemFieldRowProps) => {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
      {/* Espaço para alinhar com as linhas arrastáveis */}
      <span className="shrink-0 w-4 h-4 text-muted-foreground/30">
        <GripVertical className="h-4 w-4" />
      </span>

      <span className="flex-1 text-sm font-medium text-muted-foreground">
        {definition.label}
      </span>

      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="text-xs font-normal">
          {FIELD_TYPE_LABELS[definition.type]}
        </Badge>
        {definition.isRequired && (
          <Badge variant="outline" className="text-xs font-normal">
            Obrigatório
          </Badge>
        )}
        <Badge className="text-xs font-normal bg-primary/10 text-primary border-primary/20">
          Sistema
        </Badge>
      </div>

      {/* Espaço vazio para alinhar com o dropdown menu */}
      <div className="h-8 w-8 shrink-0" />
    </div>
  )
}

interface FieldDefinitionsTableProps {
  definitions: FieldDefinitionDto[]
  entityType: EntityType
  withinQuota: boolean
  quotaCurrent?: number
  quotaLimit?: number
}

export const FieldDefinitionsTable = ({
  definitions,
  entityType,
  withinQuota,
  quotaCurrent,
  quotaLimit,
}: FieldDefinitionsTableProps) => {
  const dndContextId = useId()

  const systemFields = definitions.filter((definition) => definition.isSystem)

  const [customFields, setCustomFields] = useState<FieldDefinitionDto[]>(
    () => definitions.filter((definition) => !definition.isSystem),
  )

  // Snapshot do estado pré-drag para rollback preciso em caso de erro
  const preReorderSnapshotRef = useRef<FieldDefinitionDto[]>([])

  // Sincroniza o estado otimístico com as definições revalidadas pelo servidor
  // (após criar/editar/excluir, o Server Component reenvia `definitions` atualizadas)
  useEffect(() => {
    setCustomFields(definitions.filter((definition) => !definition.isSystem))
  }, [definitions])

  // Estado dos dialogs — elevado para fora das linhas
  const [isUpsertOpen, setIsUpsertOpen] = useState(false)
  const [editingDefinition, setEditingDefinition] = useState<FieldDefinitionDto | undefined>(undefined)
  const [isDeletingOpen, setIsDeletingOpen] = useState(false)
  const [deletingDefinition, setDeletingDefinition] = useState<FieldDefinitionDto | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { execute: executeReorder } = useAction(reorderFieldDefinitions, {
    onError: ({ error }) => {
      // Rollback para o snapshot capturado antes do drag (não para o estado do mount)
      setCustomFields(preReorderSnapshotRef.current)
      toast.error(error.serverError ?? 'Erro ao reordenar campos.')
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = customFields.findIndex((field) => field.id === active.id)
    const newIndex = customFields.findIndex((field) => field.id === over.id)
    const reordered = arrayMove(customFields, oldIndex, newIndex)

    // Snapshot pré-drag para rollback preciso
    preReorderSnapshotRef.current = customFields

    // Atualização otimística local
    setCustomFields(reordered)

    // Offset: campos de sistema ocupam as primeiras posições
    const systemCount = systemFields.length
    executeReorder({
      entityType,
      items: reordered.map((field, index) => ({
        id: field.id,
        position: systemCount + index,
      })),
    })
  }

  const handleOpenCreate = () => {
    setEditingDefinition(undefined)
    setIsUpsertOpen(true)
  }

  const handleEdit = (definition: FieldDefinitionDto) => {
    setEditingDefinition(definition)
    setIsUpsertOpen(true)
  }

  const handleDelete = (definition: FieldDefinitionDto) => {
    setDeletingDefinition(definition)
    setIsDeletingOpen(true)
  }

  const handleUpsertOpenChange = (open: boolean) => {
    setIsUpsertOpen(open)
    if (!open) setEditingDefinition(undefined)
  }

  const handleDeleteOpenChange = (open: boolean) => {
    setIsDeletingOpen(open)
    if (!open) setDeletingDefinition(null)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Cabeçalho com quota e botão de criação */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Campos de Contato</h2>
            {quotaLimit !== undefined && quotaLimit > 0 && (
              <p className="text-xs text-muted-foreground">
                {quotaCurrent ?? 0} de {quotaLimit} campos personalizados utilizados
              </p>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleOpenCreate}
                    disabled={!withinQuota}
                    size="sm"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Novo campo
                  </Button>
                </span>
              </TooltipTrigger>
              {!withinQuota && (
                <TooltipContent>
                  <p>Você atingiu o limite do seu plano. Faça upgrade para adicionar mais campos.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Campos do sistema (fixos no topo, não arrastáveis) */}
        {systemFields.length > 0 && (
          <div className="space-y-1">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Campos do sistema
            </p>
            <div className="space-y-1.5">
              {systemFields.map((definition) => (
                <SystemFieldRow key={definition.id} definition={definition} />
              ))}
            </div>
          </div>
        )}

        {/* Campos personalizados (arrastáveis) */}
        <div className="space-y-1">
          {systemFields.length > 0 && customFields.length > 0 && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Campos personalizados
            </p>
          )}

          {customFields.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum campo personalizado criado
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clique em &quot;Novo campo&quot; para adicionar o primeiro.
              </p>
            </div>
          )}

          {customFields.length > 0 && (
            <DndContext
              id={dndContextId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={customFields.map((field) => field.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {customFields.map((definition) => (
                    <SortableFieldRow
                      key={definition.id}
                      definition={definition}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Dialogs — estado elevado para fora da lista */}
      <UpsertFieldDialog
        open={isUpsertOpen}
        onOpenChange={handleUpsertOpenChange}
        entityType={entityType}
        defaultValues={editingDefinition}
      />

      <DeleteFieldDialog
        open={isDeletingOpen}
        onOpenChange={handleDeleteOpenChange}
        definition={deletingDefinition}
      />
    </>
  )
}
