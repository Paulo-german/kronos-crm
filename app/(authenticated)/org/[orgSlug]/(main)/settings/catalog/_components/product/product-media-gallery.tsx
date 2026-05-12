'use client'

import { useState, useEffect, useId } from 'react'
import Image from 'next/image'
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
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { GripVertical, Trash2, Loader2, PlayCircle } from 'lucide-react'
import { Button } from '@/_components/ui/button'
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
import { reorderProductMedia } from '@/_actions/product/reorder-product-media'
import { deleteProductMedia } from '@/_actions/product/delete-product-media'
import type { ProductMediaDto } from '@/_data-access/product/get-product-media'
import { cn } from '@/_lib/utils'

interface SortableMediaCardProps {
  media: ProductMediaDto
  isDeleting: boolean
  onDelete: (mediaId: string) => void
}

const SortableMediaCard = ({
  media,
  isDeleting,
  onDelete,
}: SortableMediaCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isVideo = media.type === 'VIDEO'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border/50 bg-muted/30',
        isDragging && 'opacity-50 ring-2 ring-primary',
        isVideo ? 'aspect-video' : 'aspect-square',
      )}
    >
      {/* Preview */}
      {isVideo ? (
        <div className="relative h-full w-full bg-black/10">
          <video
            src={media.url}
            className="h-full w-full object-cover"
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <PlayCircle className="h-10 w-10 text-white/80 drop-shadow-md" />
          </div>
        </div>
      ) : (
        <Image
          src={media.url}
          alt={media.fileName}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 33vw, 200px"
        />
      )}

      {/* Overlay de ações */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-1.5 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
        {/* Drag handle no topo direito */}
        <div className="flex justify-end">
          <button
            type="button"
            className="cursor-grab touch-none rounded-md bg-black/50 p-1 text-white/90 hover:bg-black/70 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Botão de delete no canto inferior direito */}
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-7 w-7 bg-destructive/90 hover:bg-destructive"
                disabled={isDeleting}
                aria-label="Remover mídia"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover mídia?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A mídia será removida
                  permanentemente do produto.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onDelete(media.id)}
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Label de nome do arquivo */}
      <div className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-2 py-1 text-[10px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
        {media.fileName}
      </div>
    </div>
  )
}

interface ProductMediaGalleryProps {
  media: ProductMediaDto[]
  productId: string
  onUploadComplete?: () => void
}

export function ProductMediaGallery({
  media,
  productId,
  onUploadComplete,
}: ProductMediaGalleryProps) {
  const dndContextId = useId()
  const [isMounted, setIsMounted] = useState(false)
  const [orderedMedia, setOrderedMedia] = useState<ProductMediaDto[]>(media)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // SSR Guard obrigatório para DndContext (mesmo padrão de process-tab.tsx)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Sincroniza estado local quando as props mudam (após upload/delete via router.refresh)
  useEffect(() => {
    setOrderedMedia(media)
  }, [media])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { execute: executeReorder } = useAction(reorderProductMedia, {
    onSuccess: () => {
      toast.success('Ordem das mídias atualizada.')
    },
    onError: ({ error }) => {
      // Reverte o estado local se a action falhar
      setOrderedMedia(media)
      toast.error(error.serverError || 'Erro ao reordenar mídias.')
    },
  })

  const { execute: executeDelete, isPending: isDeletePending } = useAction(
    deleteProductMedia,
    {
      onSuccess: () => {
        toast.success('Mídia removida com sucesso.')
        setDeletingId(null)
        onUploadComplete?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao remover mídia.')
        setDeletingId(null)
      },
    },
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = orderedMedia.findIndex((item) => item.id === active.id)
    const newIndex = orderedMedia.findIndex((item) => item.id === over.id)
    const newOrder = arrayMove(orderedMedia, oldIndex, newIndex)

    setOrderedMedia(newOrder)
    executeReorder({
      productId,
      mediaIds: newOrder.map((item) => item.id),
    })
  }

  const handleDelete = (mediaId: string) => {
    setDeletingId(mediaId)
    executeDelete({ mediaId, productId })
  }

  if (orderedMedia.length === 0) return null

  // Detecta o tipo de grid com base no primeiro item (o dialog já passa mídias pré-filtradas por tipo)
  const isVideoGrid = orderedMedia[0]?.type === 'VIDEO'

  const gridContent = orderedMedia.map((item) => (
    <SortableMediaCard
      key={item.id}
      media={item}
      isDeleting={deletingId === item.id && isDeletePending}
      onDelete={handleDelete}
    />
  ))

  if (!isMounted) {
    return (
      <div
        className={cn('grid gap-3', isVideoGrid ? 'grid-cols-1' : 'grid-cols-3')}
      >
        {gridContent}
      </div>
    )
  }

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedMedia.map((item) => item.id)}
        strategy={rectSortingStrategy}
      >
        <div
          className={cn(
            'grid gap-3',
            isVideoGrid ? 'grid-cols-1' : 'grid-cols-3',
          )}
        >
          {gridContent}
        </div>
      </SortableContext>
    </DndContext>
  )
}
