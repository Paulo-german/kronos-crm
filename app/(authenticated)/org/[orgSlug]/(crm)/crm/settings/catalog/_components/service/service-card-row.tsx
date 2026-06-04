'use client'

import {
  ClockIcon,
  PencilIcon,
  TrashIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { Checkbox } from '@/_components/ui/checkbox'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import { cn } from '@/_lib/utils'
import { formatCurrency } from '@/_utils/format-currency'
import type { ServiceDto } from '@/_data-access/service/get-services'

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) return `${remainingMinutes} min`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}

const MAX_VISIBLE_PROFESSIONALS = 4

interface ServiceCardRowProps {
  service: ServiceDto
  isSelected: boolean
  onSelectionChange: (checked: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

export function ServiceCardRow({
  service,
  isSelected,
  onSelectionChange,
  onEdit,
  onDelete,
}: ServiceCardRowProps) {
  const overflowCount =
    service.professionalServices.length - MAX_VISIBLE_PROFESSIONALS

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border px-4 py-3 transition-all',
        'hover:border-primary/30 hover:bg-primary/10 hover:shadow-sm',
        isSelected
          ? 'border-primary/30 bg-primary/10'
          : 'border-border bg-card',
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelectionChange(Boolean(checked))}
        aria-label={`Selecionar ${service.name}`}
      />

      {/* Nome + categoria */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{service.name}</span>
          {service.categoryName && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {service.categoryName}
            </Badge>
          )}
        </div>
      </div>

      {/* Duração */}
      <div className="hidden shrink-0 items-center gap-1 text-sm text-muted-foreground sm:flex">
        <ClockIcon className="size-3.5" />
        {formatDuration(service.duration)}
      </div>

      {/* Preço */}
      <div className="hidden shrink-0 text-sm font-medium sm:block">
        {formatCurrency(parseFloat(service.price))}
      </div>

      {/* Status */}
      <div className="shrink-0">
        {service.isActive ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
            Ativo
          </Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
        )}
      </div>

      {/* Avatar stack dos profissionais */}
      <div className="hidden shrink-0 sm:flex">
        {service.professionalServices.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {service.professionalServices
                .slice(0, MAX_VISIBLE_PROFESSIONALS)
                .map(({ professionalId, professional }) => (
                  <Avatar
                    key={professionalId}
                    className="h-6 w-6 border-2 border-background"
                  >
                    <AvatarImage
                      src={professional.avatarUrl ?? undefined}
                      alt={professional.name}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(professional.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
            </div>
            {overflowCount > 0 && (
              <span className="text-xs text-muted-foreground">
                +{overflowCount}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            Sem profissional
          </span>
        )}
      </div>

      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu de ações</span>
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
