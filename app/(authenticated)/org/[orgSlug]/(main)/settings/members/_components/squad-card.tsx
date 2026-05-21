'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  MoreHorizontal,
  Trash2,
  Users,
  Settings2,
} from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { deleteSquad } from '@/_actions/squad/delete-squad'
import type { SquadDto } from '@/_data-access/squad/get-squads'
import type { SquadType, SalesDistributionModel } from '@prisma/client'

interface SquadCardProps {
  squad: SquadDto
  canManage: boolean
  orgSlug: string
}

const SQUAD_TYPE_LABELS: Record<SquadType, string> = {
  SALES: 'Vendas',
  SUPPORT: 'Suporte',
  CS: 'Customer Success',
  GENERAL: 'Geral',
}

const DISTRIBUTION_MODEL_LABELS: Record<SalesDistributionModel, string> = {
  ROUND_ROBIN: 'Round Robin',
  LOYALTY: 'Fidelidade',
  UTILIZATION: 'Utilização',
  MANUAL: 'Manual',
  PERFORMANCE_WEIGHTED: 'Por Performance',
}

export function SquadCard({ squad, canManage, orgSlug }: SquadCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteSquad,
    {
      onSuccess: () => {
        toast.success('Time excluído com sucesso.')
        setIsDeleteOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao excluir time.')
      },
    },
  )

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="pt-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {squad.avatarUrl ? (
                <img
                  src={squad.avatarUrl}
                  alt={squad.name}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <h3 className="truncate text-sm font-semibold leading-tight">
                {squad.name}
              </h3>
              {squad.isDefault && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Padrão
                </Badge>
              )}
            </div>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-1 -mt-1 h-7 w-7 shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Descrição */}
          {squad.description && (
            <p className="mt-2 line-clamp-2 pl-10 text-xs text-muted-foreground">
              {squad.description}
            </p>
          )}

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-1.5 pl-10">
            <Badge variant="outline" className="text-xs">
              {SQUAD_TYPE_LABELS[squad.type]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {DISTRIBUTION_MODEL_LABELS[squad.distributionModel]}
            </Badge>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t px-5 py-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {squad._count.members}{' '}
              {squad._count.members === 1 ? 'membro' : 'membros'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            asChild
          >
            <Link href={`/org/${orgSlug}/settings/members/squads/${squad.id}`}>
              <Settings2 className="h-3.5 w-3.5" />
              Gerenciar
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir time?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a excluir
            <br />
            <span className="font-semibold text-foreground">
              o time &ldquo;{squad.name}&rdquo;
            </span>{' '}
            e remover todos os seus membros.
          </p>
        }
        icon={<Trash2 />}
        variant="destructive"
        onConfirm={() => executeDelete({ id: squad.id })}
        isLoading={isDeleting}
        confirmLabel="Excluir time"
      />
    </>
  )
}
