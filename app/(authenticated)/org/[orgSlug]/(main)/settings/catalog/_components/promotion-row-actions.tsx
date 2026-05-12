'use client'

import { MoreHorizontal, PencilIcon, TrashIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import type { PromotionDto } from '@/_data-access/promotion/get-promotions'

interface PromotionRowActionsProps {
  promotion: PromotionDto
  onEdit: (promotion: PromotionDto) => void
  onDelete: (promotion: PromotionDto) => void
}

export function PromotionRowActions({ promotion, onEdit, onDelete }: PromotionRowActionsProps) {
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
