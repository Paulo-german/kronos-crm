'use client'

import { useState, useId, useEffect } from 'react'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { setManualProfessionalOrder } from '@/_actions/scheduling/set-manual-professional-order'
import { SortableProfessionalRow } from './sortable-professional-row'
import type { ManualOrderEntry } from '@/_data-access/organization/get-scheduling-settings'

interface OrderedItem {
  id: string
  name: string
}

interface ManualOrderListProps {
  professionals: ManualOrderEntry[]
  allProfessionals: { id: string; name: string }[]
}

function buildOrderedList(
  orderedEntries: ManualOrderEntry[],
  allProfessionals: { id: string; name: string }[],
): OrderedItem[] {
  // Profissionais com entrada na ordem manual primeiro (ordenados por order)
  const sortedEntries = [...orderedEntries].sort(
    (entryA, entryB) => entryA.order - entryB.order,
  )

  const orderedIds = new Set(sortedEntries.map((entry) => entry.professionalId))

  const withOrder: OrderedItem[] = sortedEntries.map((entry) => ({
    id: entry.professionalId,
    name: entry.name,
  }))

  // Profissionais sem entrada na ordem manual no final
  const withoutOrder: OrderedItem[] = allProfessionals
    .filter((professional) => !orderedIds.has(professional.id))
    .map((professional) => ({ id: professional.id, name: professional.name }))

  return [...withOrder, ...withoutOrder]
}

export function ManualOrderList({
  professionals,
  allProfessionals,
}: ManualOrderListProps) {
  const dndContextId = useId()
  const [isMounted, setIsMounted] = useState(false)
  const [items, setItems] = useState<OrderedItem[]>(() =>
    buildOrderedList(professionals, allProfessionals),
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { execute: executeReorder } = useAction(setManualProfessionalOrder, {
    onSuccess: () => {
      toast.success('Ordem salva!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar ordem.')
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    const newOrder = arrayMove(items, oldIndex, newIndex)

    // Atualização optimista da UI
    setItems(newOrder)

    // Persiste no servidor
    executeReorder({
      professionals: newOrder.map((item, index) => ({
        professionalId: item.id,
        order: index + 1,
      })),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ordem manual dos profissionais</CardTitle>
        <CardDescription>
          Arraste para definir a prioridade de atendimento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isMounted ? (
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableProfessionalRow key={item.id} professional={item} />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          items.map((item) => (
            <SortableProfessionalRow key={item.id} professional={item} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
